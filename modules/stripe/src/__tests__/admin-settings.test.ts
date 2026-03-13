import { describe, expect, it } from "vitest";
import { getSettings } from "../admin/endpoints/get-settings";

// ── Helper ───────────────────────────────────────────────────────────────────

async function callGetSettings(opts: Record<string, unknown>) {
	// biome-ignore lint/suspicious/noExplicitAny: test helper accesses internal handler
	const h = getSettings as any;
	const fn = typeof h.handler === "function" ? h.handler : h;
	return fn({ context: { options: opts } });
}

// ── configured ───────────────────────────────────────────────────────────────

describe("getSettings — configured flag", () => {
	it("returns true when apiKey is present", async () => {
		const result = await callGetSettings({
			apiKey: "sk_test_abc123def456",
		});
		expect(result.configured).toBe(true);
	});

	it("returns false when apiKey is an empty string", async () => {
		const result = await callGetSettings({ apiKey: "" });
		expect(result.configured).toBe(false);
	});

	it("returns false when apiKey is a non-string value (number)", async () => {
		const result = await callGetSettings({ apiKey: 12345 });
		expect(result.configured).toBe(false);
	});

	it("returns false when apiKey is undefined", async () => {
		const result = await callGetSettings({});
		expect(result.configured).toBe(false);
	});
});

// ── apiKeyMasked ─────────────────────────────────────────────────────────────

describe("getSettings — apiKeyMasked", () => {
	it("returns null when no apiKey is present", async () => {
		const result = await callGetSettings({});
		expect(result.apiKeyMasked).toBeNull();
	});

	it("returns null when apiKey is an empty string", async () => {
		const result = await callGetSettings({ apiKey: "" });
		expect(result.apiKeyMasked).toBeNull();
	});

	it('returns "****" for short keys (8 chars or fewer)', async () => {
		const result = await callGetSettings({ apiKey: "sk_short" });
		expect(result.apiKeyMasked).toBe("****");
	});

	it("masks correctly for longer keys (first 7 chars + asterisks)", async () => {
		// "sk_test_abc" = 11 chars → first 7 = "sk_test" + 4 asterisks
		const result = await callGetSettings({ apiKey: "sk_test_abc" });
		expect(result.apiKeyMasked).toBe("sk_test****");
	});

	it("caps asterisks at 20 for very long keys", async () => {
		// 50-char key → first 7 + 20 asterisks (capped), not 43
		const longKey = `sk_live_${"a".repeat(42)}`; // 50 chars
		const result = await callGetSettings({ apiKey: longKey });
		expect(result.apiKeyMasked).toBe(`sk_live********************`);
		// Verify the asterisk count is exactly 20
		const asterisks = result.apiKeyMasked.slice(7);
		expect(asterisks.length).toBe(20);
		expect(asterisks).toBe("*".repeat(20));
	});
});

// ── apiKeyMode ───────────────────────────────────────────────────────────────

describe("getSettings — apiKeyMode", () => {
	it('returns "live" for sk_live_ prefix', async () => {
		const result = await callGetSettings({
			apiKey: "sk_live_abc123def456ghi",
		});
		expect(result.apiKeyMode).toBe("live");
	});

	it('returns "test" for sk_test_ prefix', async () => {
		const result = await callGetSettings({
			apiKey: "sk_test_abc123def456ghi",
		});
		expect(result.apiKeyMode).toBe("test");
	});

	it('returns "unknown" for other prefixes', async () => {
		const result = await callGetSettings({
			apiKey: "rk_live_abc123def456ghi",
		});
		expect(result.apiKeyMode).toBe("unknown");
	});

	it('returns "unknown" when apiKey is empty', async () => {
		const result = await callGetSettings({ apiKey: "" });
		expect(result.apiKeyMode).toBe("unknown");
	});
});

// ── webhookSecretConfigured ──────────────────────────────────────────────────

describe("getSettings — webhookSecretConfigured", () => {
	it("returns true when webhookSecret is present", async () => {
		const result = await callGetSettings({
			apiKey: "sk_test_key",
			webhookSecret: "whsec_abc123",
		});
		expect(result.webhookSecretConfigured).toBe(true);
	});

	it("returns false when webhookSecret is an empty string", async () => {
		const result = await callGetSettings({
			apiKey: "sk_test_key",
			webhookSecret: "",
		});
		expect(result.webhookSecretConfigured).toBe(false);
	});

	it("returns false when webhookSecret is missing", async () => {
		const result = await callGetSettings({ apiKey: "sk_test_key" });
		expect(result.webhookSecretConfigured).toBe(false);
	});
});

// ── webhookSecretMasked ──────────────────────────────────────────────────────

describe("getSettings — webhookSecretMasked", () => {
	it("returns null when no webhookSecret is present", async () => {
		const result = await callGetSettings({ apiKey: "sk_test_key" });
		expect(result.webhookSecretMasked).toBeNull();
	});

	it("returns null when webhookSecret is an empty string", async () => {
		const result = await callGetSettings({
			apiKey: "sk_test_key",
			webhookSecret: "",
		});
		expect(result.webhookSecretMasked).toBeNull();
	});

	it("masks correctly for a present webhook secret", async () => {
		// "whsec_abc123" = 12 chars → first 7 = "whsec_a" + 5 asterisks
		const result = await callGetSettings({
			apiKey: "sk_test_key",
			webhookSecret: "whsec_abc123",
		});
		expect(result.webhookSecretMasked).toBe("whsec_a*****");
	});
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("getSettings — edge cases", () => {
	it("handles non-string option values gracefully (undefined for both)", async () => {
		const result = await callGetSettings({
			apiKey: undefined,
			webhookSecret: undefined,
		});
		expect(result.configured).toBe(false);
		expect(result.apiKeyMasked).toBeNull();
		expect(result.webhookSecretConfigured).toBe(false);
		expect(result.webhookSecretMasked).toBeNull();
	});
});
