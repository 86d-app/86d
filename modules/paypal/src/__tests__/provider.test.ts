import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PayPalPaymentProvider } from "../provider";

/** Tracks call count and returns different responses for auth vs API calls. */
function createMockFetch(
	// biome-ignore lint/suspicious/noExplicitAny: test mock
	apiResponse: any,
	apiOk = true,
	apiStatus = 200,
) {
	let _callIndex = 0;
	return vi.fn().mockImplementation((url: string) => {
		_callIndex++;
		// First call is always the OAuth token request
		if (typeof url === "string" && url.includes("/oauth2/token")) {
			return Promise.resolve({
				ok: true,
				status: 200,
				json: () =>
					Promise.resolve({
						access_token: "test_access_token",
						expires_in: 3600,
					}),
			});
		}
		// Subsequent calls are API requests
		return Promise.resolve({
			ok: apiOk,
			status: apiStatus,
			json: () => Promise.resolve(apiResponse),
		});
	});
}

describe("PayPalPaymentProvider", () => {
	let provider: PayPalPaymentProvider;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		provider = new PayPalPaymentProvider("client_id", "client_secret", true);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	// ── createIntent ─────────────────────────────────────────────────────

	describe("createIntent", () => {
		it("creates an order via PayPal API", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_123",
				status: "CREATED",
			});

			const result = await provider.createIntent({
				amount: 5000,
				currency: "USD",
			});
			expect(result.providerIntentId).toBe("pp_order_123");
			expect(result.status).toBe("pending");
			expect(result.providerMetadata?.paypalStatus).toBe("CREATED");
		});

		it("maps COMPLETED status to succeeded", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_comp",
				status: "COMPLETED",
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
			});
			expect(result.status).toBe("succeeded");
		});

		it("maps APPROVED status to processing", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_app",
				status: "APPROVED",
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
			});
			expect(result.status).toBe("processing");
		});

		it("maps VOIDED status to cancelled", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_void",
				status: "VOIDED",
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
			});
			expect(result.status).toBe("cancelled");
		});

		it("maps PAYER_ACTION_REQUIRED to pending", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_par",
				status: "PAYER_ACTION_REQUIRED",
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
			});
			expect(result.status).toBe("pending");
		});

		it("formats amount correctly (cents to dollars)", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_fmt",
				status: "CREATED",
			});
			await provider.createIntent({ amount: 1250, currency: "USD" });
			const apiCall = (
				globalThis.fetch as ReturnType<typeof vi.fn>
			).mock.calls.find(
				(c: string[]) =>
					typeof c[0] === "string" && c[0].includes("/checkout/orders"),
			);
			expect(apiCall).toBeDefined();
			const body = JSON.parse(apiCall?.[1].body);
			expect(body.purchase_units[0].amount.value).toBe("12.50");
		});

		it("uppercases currency", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_cur",
				status: "CREATED",
			});
			await provider.createIntent({ amount: 500, currency: "eur" });
			const apiCall = (
				globalThis.fetch as ReturnType<typeof vi.fn>
			).mock.calls.find(
				(c: string[]) =>
					typeof c[0] === "string" && c[0].includes("/checkout/orders"),
			);
			expect(apiCall).toBeDefined();
			const body = JSON.parse(apiCall?.[1].body);
			expect(body.purchase_units[0].amount.currency_code).toBe("EUR");
		});

		it("throws on PayPal API error", async () => {
			globalThis.fetch = createMockFetch(
				{ name: "INVALID_REQUEST", message: "Invalid request" },
				false,
				400,
			);

			await expect(
				provider.createIntent({ amount: 1000, currency: "USD" }),
			).rejects.toThrow("PayPal error: Invalid request");
		});
	});

	// ── confirmIntent ────────────────────────────────────────────────────

	describe("confirmIntent", () => {
		it("captures an order", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_123",
				status: "COMPLETED",
			});

			const result = await provider.confirmIntent("pp_order_123");
			expect(result.providerIntentId).toBe("pp_order_123");
			expect(result.status).toBe("succeeded");
		});
	});

	// ── cancelIntent ─────────────────────────────────────────────────────

	describe("cancelIntent", () => {
		it("returns cancelled for a pending order", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_cancel",
				status: "CREATED",
			});

			const result = await provider.cancelIntent("pp_order_cancel");
			expect(result.status).toBe("cancelled");
		});

		it("returns succeeded for COMPLETED order", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_done",
				status: "COMPLETED",
			});
			const result = await provider.cancelIntent("pp_order_done");
			expect(result.status).toBe("succeeded");
		});

		it("returns cancelled for VOIDED order", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_voided",
				status: "VOIDED",
			});
			const result = await provider.cancelIntent("pp_order_voided");
			expect(result.status).toBe("cancelled");
		});
	});

	// ── createRefund ─────────────────────────────────────────────────────

	describe("createRefund", () => {
		it("creates a refund against a capture", async () => {
			let callNum = 0;
			globalThis.fetch = vi.fn().mockImplementation((url: string) => {
				callNum++;
				if (url.includes("/oauth2/token")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () =>
							Promise.resolve({
								access_token: "test_token",
								expires_in: 3600,
							}),
					});
				}
				// GET order to find capture ID
				if (url.includes("/checkout/orders/") && callNum <= 3) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () =>
							Promise.resolve({
								id: "pp_order_ref",
								status: "COMPLETED",
								purchase_units: [
									{
										payments: {
											captures: [
												{
													id: "cap_123",
													status: "COMPLETED",
												},
											],
										},
									},
								],
							}),
					});
				}
				// POST refund
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () =>
						Promise.resolve({
							id: "ref_pp_123",
							status: "COMPLETED",
						}),
				});
			});

			const result = await provider.createRefund({
				providerIntentId: "pp_order_ref",
			});
			expect(result.providerRefundId).toBe("ref_pp_123");
			expect(result.status).toBe("succeeded");
		});

		it("throws when no capture found", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_order_nocap",
				status: "CREATED",
				purchase_units: [{ payments: {} }],
			});

			await expect(
				provider.createRefund({
					providerIntentId: "pp_order_nocap",
				}),
			).rejects.toThrow("No capture found");
		});

		it("maps FAILED refund status", async () => {
			let _callNum = 0;
			globalThis.fetch = vi.fn().mockImplementation((url: string) => {
				_callNum++;
				if (url.includes("/oauth2/token")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () =>
							Promise.resolve({
								access_token: "tok",
								expires_in: 3600,
							}),
					});
				}
				if (url.includes("/checkout/orders/")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () =>
							Promise.resolve({
								id: "ord",
								status: "COMPLETED",
								purchase_units: [
									{
										payments: {
											captures: [
												{
													id: "cap_1",
													status: "COMPLETED",
												},
											],
										},
									},
								],
							}),
					});
				}
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ id: "ref_fail", status: "FAILED" }),
				});
			});

			const result = await provider.createRefund({
				providerIntentId: "pp_order_1",
			});
			expect(result.status).toBe("failed");
		});
	});

	// ── auth token caching ───────────────────────────────────────────────

	describe("auth token caching", () => {
		it("reuses cached access token", async () => {
			globalThis.fetch = createMockFetch({
				id: "pp_cache_1",
				status: "CREATED",
			});
			await provider.createIntent({ amount: 1000, currency: "USD" });
			await provider.createIntent({ amount: 2000, currency: "USD" });

			// Auth token should be called only once (cached for second call)
			const tokenCalls = (
				globalThis.fetch as ReturnType<typeof vi.fn>
			).mock.calls.filter(
				(c: string[]) =>
					typeof c[0] === "string" && c[0].includes("/oauth2/token"),
			);
			expect(tokenCalls).toHaveLength(1);
		});

		it("throws on auth failure", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ name: "ERROR", message: "Bad creds" }),
			});

			await expect(
				provider.createIntent({ amount: 100, currency: "USD" }),
			).rejects.toThrow("PayPal auth error: Bad creds");
		});
	});
});
