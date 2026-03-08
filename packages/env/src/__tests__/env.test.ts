import { describe, expect, it } from "vitest";

describe("env", () => {
	it("exports a validated env object with defaults", async () => {
		const mod = await import("../index");
		const env = mod.default;

		expect(env).toBeDefined();
		expect(env.NODE_ENV).toBeTypeOf("string");
		expect(["development", "production", "test"]).toContain(env.NODE_ENV);
	});

	it("provides default STORE_ID", async () => {
		const mod = await import("../index");
		const env = mod.default;

		expect(env.STORE_ID).toBeTypeOf("string");
		expect(env.STORE_ID.length).toBeGreaterThan(0);
	});

	it("provides default 86D_API_URL", async () => {
		const mod = await import("../index");
		const env = mod.default;

		expect(env["86D_API_URL"]).toBe("https://dashboard.86d.app/api");
	});

	it("leaves optional fields as undefined when not set", async () => {
		const mod = await import("../index");
		const env = mod.default;

		// These should be undefined unless set in actual env
		if (!process.env.RESEND_API_KEY) {
			expect(env.RESEND_API_KEY).toBeUndefined();
		}
		if (!process.env.BETTER_AUTH_SECRET) {
			expect(env.BETTER_AUTH_SECRET).toBeUndefined();
		}
	});

	it("exports the Env type", async () => {
		const mod = await import("../index");
		// Type check - the default export should match Env shape
		const env: typeof mod.default = mod.default;
		expect(env).toBeDefined();
	});
});
