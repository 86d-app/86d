import { describe, expect, it } from "vitest";
import { getSettings } from "../admin/endpoints/get-settings";

// biome-ignore lint/suspicious/noExplicitAny: test helper accesses internal handler
const h = getSettings as any;
const fn = typeof h.handler === "function" ? h.handler : h;

function invoke(opts: Record<string, unknown>) {
	return fn({ context: { options: opts } });
}

describe("getSettings admin endpoint", () => {
	// ── configured flag ──────────────────────────────────────────────────

	describe("configured", () => {
		it("returns true when all three keys are present", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.configured).toBe(true);
		});

		it("returns false when merchantId is missing", async () => {
			const result = await invoke({
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.configured).toBe(false);
		});

		it("returns false when publicKey is missing", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.configured).toBe(false);
		});

		it("returns false when privateKey is missing", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
			});
			expect(result.configured).toBe(false);
		});

		it("returns false when all keys are missing", async () => {
			const result = await invoke({});
			expect(result.configured).toBe(false);
		});

		it("returns false when keys are empty strings", async () => {
			const result = await invoke({
				merchantId: "",
				publicKey: "",
				privateKey: "",
			});
			expect(result.configured).toBe(false);
		});

		it("returns false when keys are non-string types", async () => {
			const result = await invoke({
				merchantId: 12345,
				publicKey: true,
				privateKey: null,
			});
			expect(result.configured).toBe(false);
		});
	});

	// ── merchantIdMasked ─────────────────────────────────────────────────

	describe("merchantIdMasked", () => {
		it("returns null when no merchantId", async () => {
			const result = await invoke({
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.merchantIdMasked).toBeNull();
		});

		it('returns "****" for short IDs (<=8 chars)', async () => {
			const result = await invoke({
				merchantId: "abcdefgh",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.merchantIdMasked).toBe("****");
		});

		it("masks correctly for longer IDs (shows first 7 chars)", async () => {
			const result = await invoke({
				merchantId: "merchant_id_long_value",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			// first 7 chars: "merchan", remaining 14 chars masked (capped at 20)
			expect(result.merchantIdMasked).toMatch(/^merchan\*+$/);
			expect(result.merchantIdMasked?.startsWith("merchan")).toBe(true);
			expect(result.merchantIdMasked?.includes("*")).toBe(true);
		});

		it('returns "****" for exactly 8 character merchant ID', async () => {
			const result = await invoke({
				merchantId: "12345678",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.merchantIdMasked).toBe("****");
		});

		it("masks 9-character merchant ID with first 7 + 2 asterisks", async () => {
			const result = await invoke({
				merchantId: "123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.merchantIdMasked).toBe("1234567**");
		});
	});

	// ── publicKeyMasked ──────────────────────────────────────────────────

	describe("publicKeyMasked", () => {
		it("returns null when no publicKey", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.publicKeyMasked).toBeNull();
		});

		it("masks correctly for longer keys", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_test_key_value_long",
				privateKey: "sk_123456789",
			});
			expect(result.publicKeyMasked?.startsWith("pk_test")).toBe(true);
			expect(result.publicKeyMasked?.includes("*")).toBe(true);
		});
	});

	// ── privateKeyMasked ─────────────────────────────────────────────────

	describe("privateKeyMasked", () => {
		it("returns null when no privateKey", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
			});
			expect(result.privateKeyMasked).toBeNull();
		});

		it("masks correctly for longer keys", async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_secret_private_key_value",
			});
			expect(result.privateKeyMasked?.startsWith("sk_secr")).toBe(true);
			expect(result.privateKeyMasked?.includes("*")).toBe(true);
		});
	});

	// ── mode ─────────────────────────────────────────────────────────────

	describe("mode", () => {
		it('returns "sandbox" when sandbox is "true"', async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
				sandbox: "true",
			});
			expect(result.mode).toBe("sandbox");
		});

		it('returns "sandbox" when sandbox is "1"', async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
				sandbox: "1",
			});
			expect(result.mode).toBe("sandbox");
		});

		it('returns "production" when sandbox is empty string', async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
				sandbox: "",
			});
			expect(result.mode).toBe("production");
		});

		it('returns "production" when sandbox is missing', async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
			});
			expect(result.mode).toBe("production");
		});

		it('returns "production" when sandbox is "false"', async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
				sandbox: "false",
			});
			expect(result.mode).toBe("production");
		});

		it('returns "production" when sandbox is non-string type', async () => {
			const result = await invoke({
				merchantId: "m_123456789",
				publicKey: "pk_123456789",
				privateKey: "sk_123456789",
				sandbox: true,
			});
			expect(result.mode).toBe("production");
		});
	});
});
