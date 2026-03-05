import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StripePaymentProvider } from "../provider";

function mockFetchResponse(data: unknown, ok = true, status = 200) {
	return vi.fn().mockResolvedValue({
		ok,
		status,
		json: () => Promise.resolve(data),
	});
}

describe("StripePaymentProvider", () => {
	let provider: StripePaymentProvider;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		provider = new StripePaymentProvider("sk_test_key");
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	// ── createIntent ─────────────────────────────────────────────────────

	describe("createIntent", () => {
		it("creates a payment intent via Stripe API", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_123",
				object: "payment_intent",
				amount: 5000,
				currency: "usd",
				status: "requires_payment_method",
				client_secret: "pi_123_secret_abc",
				metadata: {},
			});

			const result = await provider.createIntent({
				amount: 5000,
				currency: "USD",
			});
			expect(result.providerIntentId).toBe("pi_123");
			expect(result.status).toBe("pending");
			expect(result.providerMetadata?.clientSecret).toBe("pi_123_secret_abc");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.stripe.com/v1/payment_intents",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer sk_test_key",
					}),
				}),
			);
		});

		it("maps succeeded status correctly", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_456",
				object: "payment_intent",
				amount: 1000,
				currency: "usd",
				status: "succeeded",
				client_secret: "secret",
				metadata: {},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
			});
			expect(result.status).toBe("succeeded");
		});

		it("maps processing status correctly", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_789",
				object: "payment_intent",
				amount: 1000,
				currency: "usd",
				status: "processing",
				client_secret: "secret",
				metadata: {},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
			});
			expect(result.status).toBe("processing");
		});

		it("throws on Stripe API error", async () => {
			globalThis.fetch = mockFetchResponse(
				{ error: { message: "Invalid API key", type: "authentication_error" } },
				false,
				401,
			);

			await expect(
				provider.createIntent({ amount: 1000, currency: "USD" }),
			).rejects.toThrow("Stripe error: Invalid API key");
		});

		it("lowercases currency", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_lc",
				object: "payment_intent",
				amount: 500,
				currency: "eur",
				status: "requires_payment_method",
				client_secret: "secret",
				metadata: {},
			});
			await provider.createIntent({ amount: 500, currency: "EUR" });
			const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
				.calls[0];
			expect(fetchCall[1].body).toContain("currency=eur");
		});
	});

	// ── confirmIntent ────────────────────────────────────────────────────

	describe("confirmIntent", () => {
		it("confirms a payment intent", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_123",
				object: "payment_intent",
				amount: 5000,
				currency: "usd",
				status: "succeeded",
				client_secret: "secret",
				metadata: {},
			});

			const result = await provider.confirmIntent("pi_123");
			expect(result.providerIntentId).toBe("pi_123");
			expect(result.status).toBe("succeeded");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.stripe.com/v1/payment_intents/pi_123/confirm",
				expect.objectContaining({ method: "POST" }),
			);
		});

		it("maps requires_action to pending", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_3ds",
				object: "payment_intent",
				amount: 2000,
				currency: "usd",
				status: "requires_action",
				client_secret: "secret",
				metadata: {},
			});
			const result = await provider.confirmIntent("pi_3ds");
			expect(result.status).toBe("pending");
		});
	});

	// ── cancelIntent ─────────────────────────────────────────────────────

	describe("cancelIntent", () => {
		it("cancels a payment intent", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "pi_cancel",
				object: "payment_intent",
				amount: 5000,
				currency: "usd",
				status: "canceled",
				client_secret: "secret",
				metadata: {},
			});

			const result = await provider.cancelIntent("pi_cancel");
			expect(result.status).toBe("cancelled");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.stripe.com/v1/payment_intents/pi_cancel/cancel",
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	// ── createRefund ─────────────────────────────────────────────────────

	describe("createRefund", () => {
		it("creates a refund", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "re_123",
				object: "refund",
				amount: 5000,
				charge: "ch_123",
				payment_intent: "pi_123",
				status: "succeeded",
				reason: null,
			});

			const result = await provider.createRefund({
				providerIntentId: "pi_123",
			});
			expect(result.providerRefundId).toBe("re_123");
			expect(result.status).toBe("succeeded");
		});

		it("sends amount when provided", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "re_partial",
				object: "refund",
				amount: 2000,
				charge: "ch_123",
				payment_intent: "pi_123",
				status: "succeeded",
				reason: null,
			});

			await provider.createRefund({
				providerIntentId: "pi_123",
				amount: 2000,
			});

			const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
				.calls[0];
			expect(fetchCall[1].body).toContain("amount=2000");
		});

		it("maps failed refund status", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "re_fail",
				object: "refund",
				amount: 1000,
				charge: "ch_1",
				payment_intent: "pi_1",
				status: "failed",
				reason: null,
			});
			const result = await provider.createRefund({
				providerIntentId: "pi_1",
			});
			expect(result.status).toBe("failed");
		});

		it("maps pending refund status", async () => {
			globalThis.fetch = mockFetchResponse({
				id: "re_pend",
				object: "refund",
				amount: 1000,
				charge: "ch_1",
				payment_intent: "pi_1",
				status: "pending",
				reason: null,
			});
			const result = await provider.createRefund({
				providerIntentId: "pi_1",
			});
			expect(result.status).toBe("pending");
		});
	});
});
