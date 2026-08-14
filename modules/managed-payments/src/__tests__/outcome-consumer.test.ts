import { createMockTransactionRunner } from "@86d-app/core/test-utils";
import { createPaymentAggregateStore } from "@86d-app/payments";
import { describe, expect, it, vi } from "vitest";
import { createManagedPaymentClient } from "../managed-payment-client";
import { consumeManagedPaymentOutcomes } from "../outcome-consumer";

describe("managed payment outcome consumer", () => {
	it("applies a confirmed authorization and acknowledges delivery", async () => {
		const transactions = createMockTransactionRunner({ storeId: "store-1" });
		await transactions.data.upsert("paymentConnection", "connection-1", {
			id: "connection-1",
			providerAccountId: "MERCHANT-1",
			name: "86d Payments",
			normalizedName: "86d payments",
			provider: "86d_payments",
			mode: "test",
			capabilities: ["authorization", "capture", "void"],
			health: "healthy",
			lifecycle: "enabled",
			secretReference: "secret/managed-1",
			enabledAt: new Date("2026-08-13T00:00:00.000Z"),
			createdAt: new Date("2026-08-13T00:00:00.000Z"),
			updatedAt: new Date("2026-08-13T00:00:00.000Z"),
		});
		const paymentAggregates = createPaymentAggregateStore(
			transactions.data,
			transactions,
		);
		await paymentAggregates.create({
			paymentId: "payment-1",
			idempotencyKey: "create-payment-1",
			checkoutId: "checkout-1",
			connectionId: "connection-1",
			paymentOption: "card",
			expectedAmount: 1_000,
			eligibleMerchandiseAmount: 800,
			currency: "USD",
		});

		const client = {
			configured: true,
			submitOperation: vi.fn(),
			listOutcomes: vi.fn(async () => [
				{
					id: "outcome-1",
					eventId: "event-1",
					version: 1 as const,
					paymentSequence: 1,
					storeId: "store-1",
					businessId: "business-1",
					bindingId: "binding-1",
					connectionId: "connection-1",
					operationId: "operation-1",
					paymentId: "payment-1",
					checkoutId: "checkout-1",
					provider: "86d_payments",
					mode: "sandbox" as const,
					state: "confirmed" as const,
					providerReference: "provider-ref-1",
					amountMinorUnits: 1_000,
					currency: "USD",
					occurredAt: "2026-08-14T00:00:00.000Z",
					payloadDigest: "a".repeat(64),
					deliveryState: "pending" as const,
				},
			]),
			acknowledgeOutcome: vi.fn(async () => ({
				replayed: false,
				outcome: {
					id: "outcome-1",
					eventId: "event-1",
					version: 1 as const,
					paymentSequence: 1,
					storeId: "store-1",
					businessId: "business-1",
					bindingId: "binding-1",
					connectionId: "connection-1",
					operationId: "operation-1",
					paymentId: "payment-1",
					checkoutId: "checkout-1",
					provider: "86d_payments",
					mode: "sandbox" as const,
					state: "confirmed" as const,
					providerReference: "provider-ref-1",
					amountMinorUnits: 1_000,
					currency: "USD",
					occurredAt: "2026-08-14T00:00:00.000Z",
					payloadDigest: "a".repeat(64),
					deliveryState: "acknowledged" as const,
				},
			})),
			preparePaymentOption: vi.fn(),
		};

		const result = await consumeManagedPaymentOutcomes({
			client: client as ReturnType<typeof createManagedPaymentClient>,
			paymentAggregates,
		});

		expect(result).toMatchObject({ processed: 1, acknowledged: 1, failed: 0 });
		expect(await paymentAggregates.get("payment-1")).toMatchObject({
			authorizedAmount: 1_000,
			state: "authorized",
		});
		expect(client.acknowledgeOutcome).toHaveBeenCalledWith({
			eventId: "event-1",
			acknowledgementKey: `outcome:event-1:${"a".repeat(64)}`,
		});
	});
});
