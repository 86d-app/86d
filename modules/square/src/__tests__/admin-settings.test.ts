import { describe, expect, it } from "vitest";
import { getSettings } from "../admin/endpoints/get-settings";

// biome-ignore lint/suspicious/noExplicitAny: test helper accesses internal handler
const h = getSettings as any;
const fn = typeof h.handler === "function" ? h.handler : h;

async function callSettings(opts: Record<string, unknown>) {
	return fn({ context: { options: opts } });
}

describe("getSettings admin endpoint", () => {
	// ── configured ────────────────────────────────────────────────────────

	describe("configured", () => {
		it("returns true when accessToken is present", async () => {
			const result = await callSettings({
				accessToken: "sq_token_abc123",
			});
			expect(result.configured).toBe(true);
		});

		it("returns false when accessToken is empty string", async () => {
			const result = await callSettings({ accessToken: "" });
			expect(result.configured).toBe(false);
		});

		it("returns false when accessToken is non-string value", async () => {
			const result = await callSettings({ accessToken: 12345 });
			expect(result.configured).toBe(false);
		});
	});

	// ── accessTokenMasked ─────────────────────────────────────────────────

	describe("accessTokenMasked", () => {
		it("returns null when no accessToken", async () => {
			const result = await callSettings({});
			expect(result.accessTokenMasked).toBeNull();
		});

		it("returns null when accessToken is empty string", async () => {
			const result = await callSettings({ accessToken: "" });
			expect(result.accessTokenMasked).toBeNull();
		});

		it('returns "****" for short tokens (8 chars or fewer)', async () => {
			const result = await callSettings({ accessToken: "abcdefgh" });
			expect(result.accessTokenMasked).toBe("****");
		});

		it('returns "****" for very short tokens', async () => {
			const result = await callSettings({ accessToken: "ab" });
			expect(result.accessTokenMasked).toBe("****");
		});

		it("masks correctly for longer tokens (shows first 7 chars)", async () => {
			// 12 chars: first 7 visible, remaining 5 masked
			const result = await callSettings({ accessToken: "abcdefghijkl" });
			expect(result.accessTokenMasked).toBe("abcdefg*****");
		});

		it("caps asterisks at 20 for very long tokens", async () => {
			// 40 chars total: first 7 visible, remaining 33 but capped at 20 asterisks
			const longToken = `abcdefg${"x".repeat(33)}`;
			const result = await callSettings({ accessToken: longToken });
			expect(result.accessTokenMasked).toBe(`abcdefg${"*".repeat(20)}`);
		});
	});

	// ── webhookSignatureConfigured ────────────────────────────────────────

	describe("webhookSignatureConfigured", () => {
		it("returns true when webhookSignatureKey is present", async () => {
			const result = await callSettings({
				accessToken: "sq_tok",
				webhookSignatureKey: "sig_key_12345678901",
			});
			expect(result.webhookSignatureConfigured).toBe(true);
		});

		it("returns false when webhookSignatureKey is empty", async () => {
			const result = await callSettings({
				accessToken: "sq_tok",
				webhookSignatureKey: "",
			});
			expect(result.webhookSignatureConfigured).toBe(false);
		});

		it("returns false when webhookSignatureKey is missing", async () => {
			const result = await callSettings({ accessToken: "sq_tok" });
			expect(result.webhookSignatureConfigured).toBe(false);
		});
	});

	// ── webhookSignatureKeyMasked ─────────────────────────────────────────

	describe("webhookSignatureKeyMasked", () => {
		it("returns null when no webhookSignatureKey", async () => {
			const result = await callSettings({ accessToken: "sq_tok" });
			expect(result.webhookSignatureKeyMasked).toBeNull();
		});

		it("masks correctly when key is present", async () => {
			const result = await callSettings({
				accessToken: "sq_tok",
				webhookSignatureKey: "webhook_secret_key_123",
			});
			// 22 chars: first 7 visible, remaining 15 masked
			expect(result.webhookSignatureKeyMasked).toBe(`webhook${"*".repeat(15)}`);
		});
	});

	// ── webhookNotificationUrl ────────────────────────────────────────────

	describe("webhookNotificationUrl", () => {
		it("returns the URL when present", async () => {
			const result = await callSettings({
				accessToken: "sq_tok",
				webhookNotificationUrl: "https://example.com/api/square/webhook",
			});
			expect(result.webhookNotificationUrl).toBe(
				"https://example.com/api/square/webhook",
			);
		});

		it("returns null when webhookNotificationUrl is empty", async () => {
			const result = await callSettings({
				accessToken: "sq_tok",
				webhookNotificationUrl: "",
			});
			expect(result.webhookNotificationUrl).toBeNull();
		});

		it("returns null when webhookNotificationUrl is missing", async () => {
			const result = await callSettings({ accessToken: "sq_tok" });
			expect(result.webhookNotificationUrl).toBeNull();
		});
	});

	// ── edge cases ────────────────────────────────────────────────────────

	describe("edge cases", () => {
		it("handles non-string option values gracefully", async () => {
			const result = await callSettings({
				accessToken: 999,
				webhookSignatureKey: null,
				webhookNotificationUrl: false,
			});
			expect(result.configured).toBe(false);
			expect(result.accessTokenMasked).toBeNull();
			expect(result.webhookSignatureConfigured).toBe(false);
			expect(result.webhookSignatureKeyMasked).toBeNull();
			expect(result.webhookNotificationUrl).toBeNull();
		});
	});
});
