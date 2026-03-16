import { db } from "db";
import env from "env";
import { NextResponse } from "next/server";

/**
 * Health check endpoint for container readiness probes.
 * Returns 200 if the app and database are reachable, 503 otherwise.
 */
export async function GET() {
	const checks: Record<string, "ok" | "error"> = {
		app: "ok",
		database: "error",
	};

	try {
		// biome-ignore lint/suspicious/noExplicitAny: raw query returns unknown shape
		await (db as any).$queryRaw`SELECT 1`;
		checks.database = "ok";
	} catch {
		checks.database = "error";
	}

	const healthy = Object.values(checks).every((v) => v === "ok");

	return NextResponse.json(
		{
			status: healthy ? "healthy" : "degraded",
			storeId: env.STORE_ID,
			checks,
			timestamp: new Date().toISOString(),
		},
		{ status: healthy ? 200 : 503 },
	);
}
