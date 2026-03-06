import { getSession } from "auth/actions";
import { verifyStoreAdminAccess } from "auth/store-access";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logger } from "utils/logger";
import { createRateLimiter } from "utils/rate-limit";
import { ensureBooted } from "~/lib/api-registry";
import { createApiRouter, getModuleIdForPath } from "../../../generated/api";

type RouteParams = { params: Promise<{ path: string[] }> };

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Created once at module load — shared across all requests in this process.

/** General public endpoint limit: 120 requests per minute per IP. */
const publicLimiter = createRateLimiter({ limit: 120, window: 60_000 });

/** Sensitive public endpoints (subscribe, checkout initiation): 10 per 10 minutes per IP. */
const sensitiveLimiter = createRateLimiter({ limit: 10, window: 600_000 });

/** Admin endpoint limit: 300 requests per minute per session user. */
const adminLimiter = createRateLimiter({ limit: 300, window: 60_000 });

// Paths that get the stricter rate limit
const SENSITIVE_PATHS = new Set([
	"/newsletter/subscribe",
	"/newsletter/unsubscribe",
	"/payments/intents",
]);

function getClientIp(req: NextRequest): string {
	return (
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		req.headers.get("x-real-ip") ??
		"unknown"
	);
}

// ── Error response normalization ──────────────────────────────────────────────
// Module endpoints return { error: string, status: N } but the platform uses
// { error: { code, message } } consistently. Normalize at the edge.

function httpStatusToCode(status: number): string {
	switch (status) {
		case 400:
			return "BAD_REQUEST";
		case 401:
			return "UNAUTHORIZED";
		case 403:
			return "FORBIDDEN";
		case 404:
			return "NOT_FOUND";
		case 409:
			return "CONFLICT";
		case 422:
			return "UNPROCESSABLE_ENTITY";
		case 429:
			return "TOO_MANY_REQUESTS";
		default:
			return "INTERNAL_SERVER_ERROR";
	}
}

async function normalizeErrorResponse(
	response: Response,
): Promise<NextResponse> {
	try {
		const body = await response.json();
		// Already structured — pass through
		if (body.error && typeof body.error === "object" && body.error.code) {
			return NextResponse.json(body, { status: response.status });
		}
		// Module-style { error: string } — normalize
		if (body.error && typeof body.error === "string") {
			return NextResponse.json(
				{
					error: {
						code: httpStatusToCode(response.status),
						message: body.error,
					},
				},
				{ status: response.status },
			);
		}
		// Unknown shape — return as-is
		return NextResponse.json(body, { status: response.status });
	} catch {
		return NextResponse.json(
			{
				error: {
					code: "INTERNAL_SERVER_ERROR",
					message: "An unexpected error occurred.",
				},
			},
			{ status: response.status },
		);
	}
}

function rateLimitResponse(resetAt: number): NextResponse {
	const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
	return NextResponse.json(
		{
			error: {
				code: "TOO_MANY_REQUESTS",
				message: "Rate limit exceeded. Please slow down.",
			},
		},
		{
			status: 429,
			headers: {
				"Retry-After": String(retryAfter),
				"X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
			},
		},
	);
}

/**
 * Handle all API requests.
 * Uses session-based authentication (cookies) for browser-based storefront and admin.
 */
async function handleRequest(req: NextRequest, ctx: RouteParams) {
	const { path } = await ctx.params;
	const fullPath = `/${path.join("/")}`;
	const isAdmin = fullPath.startsWith("/admin");

	// ── Session-based authentication ─────────────────────────────────────
	if (isAdmin) {
		const session = await getSession();

		if (!session) {
			return NextResponse.json(
				{ error: { code: "UNAUTHORIZED", message: "Admin access required." } },
				{ status: 401 },
			);
		}

		// Verify user has admin role (better-auth admin plugin)
		const access = verifyStoreAdminAccess(session.user);
		if (!access.hasAccess) {
			logger.warn("Store admin access denied", {
				userId: session.user.id,
				path: fullPath,
			});
			return NextResponse.json(
				{
					error: {
						code: "FORBIDDEN",
						message: "You do not have permission to access this store.",
					},
				},
				{ status: 403 },
			);
		}

		// Rate limit by user ID for admin routes
		const userId = session.user.id;
		const result = adminLimiter.check(`admin:${userId}`);
		if (!result.allowed) {
			logger.warn("Admin rate limit exceeded", { userId, path: fullPath });
			return rateLimitResponse(result.resetAt);
		}
	} else {
		// Rate limit public routes by IP
		const ip = getClientIp(req);
		const isSensitive = SENSITIVE_PATHS.has(fullPath);
		const limiter = isSensitive ? sensitiveLimiter : publicLimiter;
		const limitKey = `${isSensitive ? "sensitive" : "public"}:${ip}`;

		const result = limiter.check(limitKey);
		if (!result.allowed) {
			logger.warn("Public rate limit exceeded", {
				ip,
				path: fullPath,
				sensitive: isSensitive,
			});
			return rateLimitResponse(result.resetAt);
		}
	}

	const session = await getSession();
	return handleAuthedRequest(req, fullPath, session);
}

/**
 * Process the actual request after authentication is resolved.
 */
async function handleAuthedRequest(
	req: NextRequest,
	fullPath: string,
	// biome-ignore lint/suspicious/noExplicitAny: Session type from better-auth
	session: any,
) {
	try {
		const reg = await ensureBooted();

		const context = reg.createRequestContext(session);
		const resolvedModuleId = getModuleIdForPath(fullPath);
		if (resolvedModuleId) {
			(context as { moduleId?: string }).moduleId = resolvedModuleId;
		}

		const router = createApiRouter(context, {
			basePath: "/api",
			onError: (e) => {
				logger.error("Router error", {
					path: fullPath,
					error: e instanceof Error ? e.message : String(e),
				});
			},
		});

		const response = await router.handler(req);

		// Normalize module error responses to { error: { code, message } }
		if (response.status >= 400) {
			return normalizeErrorResponse(response);
		}

		return response;
	} catch (error) {
		logger.error("API route unhandled error", {
			path: fullPath,
			error: error instanceof Error ? error.message : String(error),
		});
		return NextResponse.json(
			{
				error: {
					code: "INTERNAL_SERVER_ERROR",
					message: "An unexpected error occurred.",
				},
			},
			{ status: 500 },
		);
	}
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
