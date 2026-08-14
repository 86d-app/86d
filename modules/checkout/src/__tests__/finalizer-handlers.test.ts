import type { CapabilityInvoker } from "@86d-app/core/capabilities";
import {
	orderCreateCapability,
	paymentCheckoutCapability,
	taxQuoteV2Capability,
} from "@86d-app/core/commerce-capabilities";
import { inventoryCheckoutV2Capability } from "@86d-app/core/inventory-reservation-capability";
import { describe, expect, it } from "vitest";
import { createCheckoutFinalizationStore } from "../finalization";
import {
	createCheckoutFinalizationHandlers,
	createCheckoutFinalizationTransport,
} from "../finalizer-handlers";
import { createCheckoutController } from "../service-impl";
import { createTransactionTestStore } from "./transaction-test-utils";

const address = {
	firstName: "Jane",
	lastName: "Doe",
	line1: "1 Main St",
	city: "Austin",
	state: "TX",
	postalCode: "78701",
	country: "US",
};

function admission(overrides?: {
	taxQuoteId?: string;
	inventoryReservationIds?: string[];
	paymentConnectionId?: string;
}) {
	return {
		operationKey: "finalize-operation-handlers-1",
		checkoutId: "checkout-1",
		expectedRevision: 1,
		acceptedInput: {
			acceptedOfferId: "offer-1",
			acceptanceId: "acceptance-1",
			catalogRevisionId: "catalog-revision-1",
			pricingDecisionId: "pricing-decision-1",
			discountDecisionIds: [],
			inventoryReservationIds: overrides?.inventoryReservationIds ?? [
				"reservation-1",
			],
			shippingQuoteId: "shipping-quote-1",
			shippingOptionId: "shipping-option-1",
			taxQuoteId: overrides?.taxQuoteId ?? "quote-1",
			paymentConnectionId:
				overrides?.paymentConnectionId ?? "payment-connection-1",
			paymentPolicyId: "authorize-then-capture-v1",
		},
	};
}

function taxDecision(
	status: "CALCULATED" | "REVIEW_REQUIRED",
	request: {
		currency: string;
		lineItems: Array<{
			lineId: string;
			productId: string;
			taxCategoryId: string;
			quantity: number;
			unitAmount: number;
			discountAmount?: number;
			variantId?: string;
		}>;
		shippingAmount?: number;
	},
) {
	const subtotal = request.lineItems.reduce(
		(sum, line) => sum + line.unitAmount * line.quantity,
		0,
	);
	const discount = request.lineItems.reduce(
		(sum, line) => sum + (line.discountAmount ?? 0),
		0,
	);
	const shipping = request.shippingAmount ?? 0;
	const tax =
		status === "REVIEW_REQUIRED"
			? null
			: Math.round((subtotal - discount) * 0.0825);
	return {
		quoteId: status === "REVIEW_REQUIRED" ? "quote-review" : "quote-1",
		jurisdictionDecision:
			status === "REVIEW_REQUIRED"
				? ("BLOCKED" as const)
				: ("COLLECT" as const),
		status,
		reason:
			status === "REVIEW_REQUIRED"
				? ("RATE_NOT_CONFIGURED" as const)
				: ("TAX_CALCULATED" as const),
		policyVersion: status === "REVIEW_REQUIRED" ? "unconfigured" : "policy-v1",
		sourceVersion: status === "REVIEW_REQUIRED" ? "unconfigured" : "rates-v1",
		issuedAt: "2026-08-14T00:00:00.000Z",
		expiresAt: "2026-08-14T00:10:00.000Z",
		currency: request.currency,
		totals: {
			subtotal,
			discount,
			shipping,
			taxable: subtotal - discount,
			lineTax: tax,
			shippingTax: status === "REVIEW_REQUIRED" ? null : 0,
			tax,
			grandTotal: tax === null ? null : subtotal - discount + shipping + tax,
		},
		lineAllocations: request.lineItems.map((line) => {
			const grossAmount = line.unitAmount * line.quantity;
			const discountAmount = line.discountAmount ?? 0;
			return {
				lineId: line.lineId,
				productId: line.productId,
				...(line.variantId ? { variantId: line.variantId } : {}),
				taxCategoryId: line.taxCategoryId,
				quantity: line.quantity,
				grossAmount,
				discountAmount,
				taxableAmount: grossAmount - discountAmount,
				taxAmount:
					tax === null
						? null
						: Math.round((grossAmount - discountAmount) * 0.0825),
			};
		}),
	};
}

function taxOnlyInvoker(
	status: "CALCULATED" | "REVIEW_REQUIRED",
): CapabilityInvoker {
	return {
		async invoke(definition, request) {
			if (definition === taxQuoteV2Capability) {
				return {
					ok: true as const,
					decision: taxDecision(
						status,
						request as Parameters<typeof taxDecision>[1],
					),
				};
			}
			return {
				ok: false as const,
				failure: {
					code: "CAPABILITY_UNAVAILABLE" as const,
					capability: definition.name,
					version: definition.version,
				},
			};
		},
	} as CapabilityInvoker;
}

describe("Checkout finalization handlers", () => {
	it("stops at shipping_and_tax with TAX_REVIEW_REQUIRED and never invents zero tax", async () => {
		const storage = createTransactionTestStore();
		const checkout = createCheckoutController(storage.data);
		await checkout.create({
			id: "checkout-1",
			subtotal: 1000,
			total: 1000,
			lineItems: [
				{ productId: "p1", name: "Widget", price: 1000, quantity: 1 },
			],
			shippingAddress: address,
			taxAmount: 40,
		});

		const store = createCheckoutFinalizationStore(storage.transactions);
		const admitted = await store.admit(admission());
		const handlers = createCheckoutFinalizationHandlers({
			checkout,
			capabilities: taxOnlyInvoker("REVIEW_REQUIRED"),
		});

		const run = await createCheckoutFinalizationTransport({
			store,
			handlers,
		}).run({ finalizationId: admitted.finalization.id });

		expect(run.finalization).toMatchObject({
			state: "needs_attention",
			currentStep: "shipping_and_tax",
			needsAttention: { code: "TAX_REVIEW_REQUIRED" },
		});
		const unchanged = await checkout.getById("checkout-1");
		expect(unchanged?.taxAmount).toBe(40);
		expect(unchanged?.status).toBe("pending");
	});

	it("revalidates CALCULATED tax, then fails closed on contained payment activation", async () => {
		const storage = createTransactionTestStore();
		const checkout = createCheckoutController(storage.data);
		await checkout.create({
			id: "checkout-1",
			subtotal: 1000,
			total: 1083,
			taxAmount: 0,
			lineItems: [
				{ productId: "p1", name: "Widget", price: 1000, quantity: 1 },
			],
			shippingAddress: address,
		});

		const store = createCheckoutFinalizationStore(storage.transactions);
		const admitted = await store.admit(admission());
		const handlers = createCheckoutFinalizationHandlers({
			checkout,
			capabilities: taxOnlyInvoker("CALCULATED"),
		});

		const run = await createCheckoutFinalizationTransport({
			store,
			handlers,
		}).run({ finalizationId: admitted.finalization.id });

		expect(run.finalization).toMatchObject({
			state: "needs_attention",
			currentStep: "payment_outcome",
			needsAttention: { code: "PAYMENT_ACTIVATION_REQUIRED" },
		});
		const taxed = await checkout.getById("checkout-1");
		expect(taxed?.taxAmount).toBe(83);
		expect(taxed?.metadata).toMatchObject({
			taxQuoteId: "quote-1",
			taxQuoteStatus: "CALCULATED",
		});
	});

	it("completes the Checkout session once payment and Order succeed", async () => {
		const storage = createTransactionTestStore();
		const checkout = createCheckoutController(storage.data);
		await checkout.create({
			id: "checkout-1",
			subtotal: 1000,
			total: 0,
			taxAmount: 0,
			discountAmount: 1000,
			lineItems: [
				{ productId: "p1", name: "Widget", price: 1000, quantity: 1 },
			],
			shippingAddress: address,
		});

		const capabilities = {
			async invoke(definition: { name: string; version: string }, request: unknown) {
				if (definition === taxQuoteV2Capability) {
					return {
						ok: true as const,
						decision: taxDecision(
							"CALCULATED",
							request as Parameters<typeof taxDecision>[1],
						),
					};
				}
				if (definition === inventoryCheckoutV2Capability) {
					return {
						ok: true as const,
						decision: {
							operation: "reserve" as const,
							reservation: {
								id: "reservation-live-1",
								checkoutId: "checkout-1",
								lineId: "p1::0",
								productId: "p1",
								quantity: 1,
								leaseExpiresAt: "2026-08-14T00:15:00.000Z",
								status: "reserved" as const,
							},
						},
					};
				}
				if (definition === orderCreateCapability) {
					return {
						ok: true as const,
						decision: {
							orderId: "order:fin-1",
							orderNumber: "1001",
						},
					};
				}
				if (definition === paymentCheckoutCapability) {
					return {
						ok: false as const,
						failure: {
							code: "PAYMENT_NOT_FOUND" as const,
							message: "unused",
						},
					};
				}
				return {
					ok: false as const,
					failure: {
						code: "CAPABILITY_UNAVAILABLE" as const,
						capability: definition.name,
						version: definition.version,
					},
				};
			},
		} as CapabilityInvoker;

		const store = createCheckoutFinalizationStore(storage.transactions);
		const admitted = await store.admit(
			admission({ inventoryReservationIds: ["reservation-1"] }),
		);

		const handlers = createCheckoutFinalizationHandlers({
			checkout,
			capabilities,
		});
		const run = await createCheckoutFinalizationTransport({
			store,
			handlers,
		}).run({ finalizationId: admitted.finalization.id });

		expect(run.finalization.state).toBe("completed");
		expect(run.finalization.result.orderId).toBeTruthy();
		const completed = await checkout.getById("checkout-1");
		expect(completed?.status).toBe("completed");
		expect(completed?.orderId).toBe(run.finalization.result.orderId);
	});
});
