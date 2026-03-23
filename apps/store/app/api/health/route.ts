import { db } from "db";
import env from "env";
import { NextResponse } from "next/server";
import { getStorage } from "~/lib/storage";

/**
 * Health check endpoint for container readiness probes.
 *
 * Returns 200 if the app and database are reachable.
 * Returns 503 if critical services (database) are down.
 * Storage failures degrade to a warning but don't fail the probe,
 * since the store can still serve pages without uploads.
 */
export async function GET() {
	const checks: Record<string, "ok" | "error"> = {
		app: "ok",
		database: "error",
		storage: "error",
	};

	// Database — critical (503 if down)
	try {
		await db.$queryRaw`SELECT 1`;
		checks.database = "ok";
	} catch {
		checks.database = "error";
	}

	// Storage — non-critical (store works without uploads)
	try {
		const storage = getStorage();
		const storageOk = await storage.healthCheck();
		checks.storage = storageOk ? "ok" : "error";
	} catch {
		checks.storage = "error";
	}

	// Critical checks determine the HTTP status
	const critical = checks.database === "ok";
	const allOk = Object.values(checks).every((v) => v === "ok");

	return NextResponse.json(
		{
			status: allOk ? "healthy" : critical ? "degraded" : "unhealthy",
			storeId: env.STORE_ID,
			checks,
			timestamp: new Date().toISOString(),
		},
		{ status: critical ? 200 : 503 },
	);
}
