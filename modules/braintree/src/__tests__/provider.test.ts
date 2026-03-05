import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BraintreePaymentProvider } from "../provider";

function mockFetchResponse(data: unknown, ok = true, status = 200) {
	return vi.fn().mockResolvedValue({
		ok,
		status,
		json: () => Promise.resolve(data),
	});
}

describe("BraintreePaymentProvider", () => {
	let provider: BraintreePaymentProvider;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		provider = new BraintreePaymentProvider(
			"merchant_123",
			"public_key",
			"private_key",
			true,
		);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	// ── createIntent ─────────────────────────────────────────────────────

	describe("createIntent", () => {
		const validMeta = { paymentMethodNonce: "test-nonce" };

		it("creates a transaction via Braintree API", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_txn_123",
					status: "authorized",
					amount: "50.00",
					currencyIsoCode: "USD",
				},
			});

			const result = await provider.createIntent({
				amount: 5000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.providerIntentId).toBe("bt_txn_123");
			expect(result.status).toBe("pending"); // authorized → pending
			expect(result.providerMetadata?.braintreeStatus).toBe("authorized");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				"https://api.sandbox.braintreegateway.com/merchants/merchant_123/transactions",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Braintree-Version": "2019-01-01",
					}),
				}),
			);
		});

		it("throws when paymentMethodNonce is missing", async () => {
			await expect(
				provider.createIntent({ amount: 1000, currency: "USD" }),
			).rejects.toThrow("Braintree requires a paymentMethodNonce in metadata");
		});

		it("throws when metadata is provided without nonce", async () => {
			await expect(
				provider.createIntent({
					amount: 1000,
					currency: "USD",
					metadata: { someOtherField: "value" },
				}),
			).rejects.toThrow("Braintree requires a paymentMethodNonce in metadata");
		});

		it("maps settled status to succeeded", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_settled",
					status: "settled",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("succeeded");
		});

		it("maps voided status to cancelled", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_void",
					status: "voided",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("cancelled");
		});

		it("maps submitted_for_settlement to processing", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_sfs",
					status: "submitted_for_settlement",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("processing");
		});

		it("maps settling to processing", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_settling",
					status: "settling",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("processing");
		});

		it("maps failed to failed", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_fail",
					status: "failed",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("failed");
		});

		it("maps processor_declined to failed", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_declined",
					status: "processor_declined",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("failed");
		});

		it("maps gateway_rejected to failed", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_rejected",
					status: "gateway_rejected",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(result.status).toBe("failed");
		});

		it("formats amount correctly (cents to dollars)", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_fmt",
					status: "authorized",
					amount: "12.50",
					currencyIsoCode: "USD",
				},
			});
			await provider.createIntent({
				amount: 1250,
				currency: "USD",
				metadata: validMeta,
			});
			const body = JSON.parse(
				(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.transaction.amount).toBe("12.50");
		});

		it("uses paymentMethodNonce from metadata", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_nonce",
					status: "authorized",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: { paymentMethodNonce: "real-nonce-123" },
			});
			const body = JSON.parse(
				(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.transaction.payment_method_nonce).toBe("real-nonce-123");
		});

		it("uses sandbox URL", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_sandbox",
					status: "authorized",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			await provider.createIntent({
				amount: 1000,
				currency: "USD",
				metadata: validMeta,
			});
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining("sandbox.braintreegateway.com"),
				expect.anything(),
			);
		});

		it("throws on Braintree API error", async () => {
			globalThis.fetch = mockFetchResponse(
				{
					apiErrorResponse: {
						message: "Transaction failed",
						errors: {},
					},
				},
				false,
				422,
			);

			await expect(
				provider.createIntent({
					amount: 1000,
					currency: "USD",
					metadata: validMeta,
				}),
			).rejects.toThrow("Braintree error: Transaction failed");
		});
	});

	// ── confirmIntent ────────────────────────────────────────────────────

	describe("confirmIntent", () => {
		it("submits a transaction for settlement", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_txn_confirm",
					status: "submitted_for_settlement",
					amount: "50.00",
					currencyIsoCode: "USD",
				},
			});

			const result = await provider.confirmIntent("bt_txn_confirm");
			expect(result.providerIntentId).toBe("bt_txn_confirm");
			expect(result.status).toBe("processing");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining(
					"/transactions/bt_txn_confirm/submit_for_settlement",
				),
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	// ── cancelIntent ─────────────────────────────────────────────────────

	describe("cancelIntent", () => {
		it("voids a transaction", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_txn_void",
					status: "voided",
					amount: "50.00",
					currencyIsoCode: "USD",
				},
			});

			const result = await provider.cancelIntent("bt_txn_void");
			expect(result.status).toBe("cancelled");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/transactions/bt_txn_void/void"),
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	// ── createRefund ─────────────────────────────────────────────────────

	describe("createRefund", () => {
		it("creates a full refund", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_ref_123",
					status: "settled",
					amount: "50.00",
					currencyIsoCode: "USD",
				},
			});

			const result = await provider.createRefund({
				providerIntentId: "bt_txn_123",
			});
			expect(result.providerRefundId).toBe("bt_ref_123");
			expect(result.status).toBe("succeeded");

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/transactions/bt_txn_123/refunds"),
				expect.objectContaining({ method: "POST" }),
			);
		});

		it("creates a partial refund with amount", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_ref_partial",
					status: "settling",
					amount: "20.00",
					currencyIsoCode: "USD",
				},
			});

			await provider.createRefund({
				providerIntentId: "bt_txn_123",
				amount: 2000,
			});

			const body = JSON.parse(
				(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.refund.amount).toBe("20.00");
		});

		it("maps failed refund status", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_ref_fail",
					status: "failed",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createRefund({
				providerIntentId: "bt_txn_1",
			});
			expect(result.status).toBe("failed");
		});

		it("maps processor_declined refund to failed", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_ref_declined",
					status: "processor_declined",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createRefund({
				providerIntentId: "bt_txn_1",
			});
			expect(result.status).toBe("failed");
		});

		it("maps settlement_pending to pending", async () => {
			globalThis.fetch = mockFetchResponse({
				transaction: {
					id: "bt_ref_pend",
					status: "settlement_pending",
					amount: "10.00",
					currencyIsoCode: "USD",
				},
			});
			const result = await provider.createRefund({
				providerIntentId: "bt_txn_1",
			});
			expect(result.status).toBe("pending");
		});
	});
});
