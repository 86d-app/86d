import { describe, expect, it } from "vitest";
import { getSettings } from "../admin/endpoints/get-settings";

// ── Helper ───────────────────────────────────────────────────────────────────

async function callGetSettings(opts: Record<string, unknown>) {
	// biome-ignore lint/suspicious/noExplicitAny: test helper accesses internal handler
	const h = getSettings as any;
	const fn = typeof h.handler === "function" ? h.handler : h;
	return fn({ context: { options: opts } });
}

// ── configured flag ──────────────────────────────────────────────────────────

describe("getSettings — configured flag", () => {
	it("returns configured true when both clientId and clientSecret present", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
		});
		expect(result.configured).toBe(true);
	});

	it("returns configured false when clientId is missing", async () => {
		const result = await callGetSettings({
			clientSecret: "secret_12345678",
		});
		expect(result.configured).toBe(false);
	});

	it("returns configured false when clientSecret is missing", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
		});
		expect(result.configured).toBe(false);
	});

	it("returns configured false when both are missing", async () => {
		const result = await callGetSettings({});
		expect(result.configured).toBe(false);
	});
});

// ── clientIdMasked ───────────────────────────────────────────────────────────

describe("getSettings — clientIdMasked", () => {
	it("returns '****' for short IDs (<=8 chars)", async () => {
		const result = await callGetSettings({
			clientId: "ABC",
			clientSecret: "secret_12345678",
		});
		expect(result.clientIdMasked).toBe("****");
	});

	it("returns '****' for IDs exactly 8 chars", async () => {
		const result = await callGetSettings({
			clientId: "12345678",
			clientSecret: "secret_12345678",
		});
		expect(result.clientIdMasked).toBe("****");
	});

	it("masks correctly for longer IDs (first 7 chars visible)", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
		});
		// "AaBbCcD" + 5 asterisks (length 12 - 7 = 5)
		expect(result.clientIdMasked).toBe("AaBbCcD*****");
	});

	it("caps asterisks at 20 for very long IDs", async () => {
		const longId = `AaBbCcD${"x".repeat(50)}`;
		const result = await callGetSettings({
			clientId: longId,
			clientSecret: "secret_12345678",
		});
		// First 7 chars + 20 asterisks (capped)
		expect(result.clientIdMasked).toBe(`AaBbCcD${"*".repeat(20)}`);
	});

	it("returns null when no clientId provided", async () => {
		const result = await callGetSettings({
			clientSecret: "secret_12345678",
		});
		expect(result.clientIdMasked).toBeNull();
	});
});

// ── clientSecretMasked ───────────────────────────────────────────────────────

describe("getSettings — clientSecretMasked", () => {
	it("returns null when no clientSecret provided", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
		});
		expect(result.clientSecretMasked).toBeNull();
	});

	it("masks clientSecret correctly for longer secrets", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
		});
		// "secret_" (7 chars) + 7 asterisks (length 16 - 7 = 9... wait: "secret_12345678" is 15 chars)
		// First 7: "secret_", remaining: 15 - 7 = 8
		expect(result.clientSecretMasked).toBe(`secret_${"*".repeat(8)}`);
	});
});

// ── mode ─────────────────────────────────────────────────────────────────────

describe("getSettings — mode", () => {
	it("returns 'sandbox' when sandbox='true'", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			sandbox: "true",
		});
		expect(result.mode).toBe("sandbox");
	});

	it("returns 'sandbox' when sandbox='1'", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			sandbox: "1",
		});
		expect(result.mode).toBe("sandbox");
	});

	it("returns 'live' when sandbox is empty string", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			sandbox: "",
		});
		expect(result.mode).toBe("live");
	});

	it("returns 'live' when sandbox is not provided", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
		});
		expect(result.mode).toBe("live");
	});

	it("returns 'live' when sandbox has other value", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			sandbox: "false",
		});
		expect(result.mode).toBe("live");
	});
});

// ── webhookId ────────────────────────────────────────────────────────────────

describe("getSettings — webhookId", () => {
	it("returns webhookIdConfigured true when webhookId present", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			webhookId: "WH-ABCDEFGHIJ",
		});
		expect(result.webhookIdConfigured).toBe(true);
	});

	it("returns webhookIdConfigured false when webhookId empty", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			webhookId: "",
		});
		expect(result.webhookIdConfigured).toBe(false);
	});

	it("returns webhookIdConfigured false when webhookId not provided", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
		});
		expect(result.webhookIdConfigured).toBe(false);
	});

	it("returns webhookIdMasked null when no webhookId", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
		});
		expect(result.webhookIdMasked).toBeNull();
	});

	it("masks webhookId correctly when present", async () => {
		const result = await callGetSettings({
			clientId: "AaBbCcDdEeFf",
			clientSecret: "secret_12345678",
			webhookId: "WH-ABCDEFGHIJ",
		});
		// "WH-ABCDEFGHIJ" is 13 chars; first 7 = "WH-ABCD", remaining = 6
		expect(result.webhookIdMasked).toBe(`WH-ABCD${"*".repeat(6)}`);
	});
});

// ── non-string option values ─────────────────────────────────────────────────

describe("getSettings — non-string option values", () => {
	it("handles numeric option values gracefully (treated as empty)", async () => {
		const result = await callGetSettings({
			clientId: 12345,
			clientSecret: 67890,
			sandbox: true,
			webhookId: 42,
		});
		// str() returns "" for non-string values
		expect(result.configured).toBe(false);
		expect(result.clientIdMasked).toBeNull();
		expect(result.clientSecretMasked).toBeNull();
		expect(result.mode).toBe("live");
		expect(result.webhookIdConfigured).toBe(false);
		expect(result.webhookIdMasked).toBeNull();
	});
});
