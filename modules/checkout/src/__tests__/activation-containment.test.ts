import { createMockSession } from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutSession } from "../service";
import {
	capturePaymentUnavailable,
	completeSessionUnavailable,
	confirmSessionUnavailable,
	createPaymentUnavailable,
	getPaymentUnavailable,
} from "../store/endpoints/activation-unavailable";
import { createSession } from "../store/endpoints/create-session";
import { getShippingRates } from "../store/endpoints/get-shipping-rates";
import { createGuestProofMetadata } from "../store/endpoints/guest-proof";
import { updateSession } from "../store/endpoints/update-session";

const shippingAddress = {
	firstName: "Ada",
	lastName: "Lovelace",
	line1: "123 Main St",
	city: "Austin",
	state: "TX",
	postalCode: "78701",
	country: "US",
};

function checkoutSession(
	overrides: Partial<CheckoutSession> = {},
): CheckoutSession {
	const now = new Date("2026-08-13T12:00:00.000Z");
	return {
		id: "session-1",
		revision: 1,
		cartId: "cart-1",
		status: "pending",
		subtotal: 2_500,
		taxAmount: 0,
		shippingAmount: 0,
		discountAmount: 0,
		giftCardAmount: 0,
		storeCreditAmount: 0,
		total: 2_500,
		currency: "USD",
		expiresAt: new Date("2026-08-13T12:30:00.000Z"),
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function capabilityInvoker(options?: {
	cartFailure?: string;
	productFailure?: string;
	variantId?: string;
}) {
	return {
		invoke: vi.fn(async (definition: { name: string }) => {
			if (definition.name === "cart.snapshot") {
				if (options?.cartFailure) {
					return {
						ok: false,
						failure: { code: options.cartFailure },
					};
				}
				return {
					ok: true,
					decision: {
						cartId: "cart-1",
						revision: "2026-08-13T12:00:00.000Z",
						items: [
							{
								productId: "product-1",
								...(options?.variantId ? { variantId: options.variantId } : {}),
								quantity: 2,
							},
						],
					},
				};
			}
			if (definition.name === "catalog.product.resolve") {
				if (options?.productFailure) {
					return {
						ok: false,
						failure: { code: options.productFailure },
					};
				}
				return {
					ok: true,
					decision: {
						product: {
							id: "product-1",
							name: "Authoritative Product",
							slug: "authoritative-product",
							status: "active",
							price: 1_250,
							sku: "REAL-SKU",
							images: [],
						},
					},
				};
			}
			return {
				ok: false,
				failure: {
					code: "CAPABILITY_UNAVAILABLE",
					capability: definition.name,
					version: "1.0.0",
				},
			};
		}),
	};
}

function guestCreateInput(
	create: ReturnType<typeof vi.fn>,
	capabilities = capabilityInvoker(),
) {
	return {
		body: { cartId: "cart-1" },
		headers: new Headers({ cookie: "cart_guest_id=guest-1" }),
		context: {
			controllers: { checkout: { create } },
			capabilities,
			session: null,
		},
	};
}

describe("checkout activation containment", () => {
	it("fails before persistence when an authoritative Cart snapshot is unavailable", async () => {
		const create = vi.fn();
		const result = await createSession(
			guestCreateInput(
				create,
				capabilityInvoker({ cartFailure: "CAPABILITY_UNAVAILABLE" }),
			),
		);

		expect(result).toMatchObject({
			code: "CHECKOUT_CART_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("fails before persistence when authoritative product data is unavailable", async () => {
		const create = vi.fn();
		const result = await createSession(
			guestCreateInput(
				create,
				capabilityInvoker({ productFailure: "CAPABILITY_UNAVAILABLE" }),
			),
		);

		expect(result).toMatchObject({
			code: "CHECKOUT_PRICING_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("derives product identity, quantity, and price from authoritative Store decisions", async () => {
		const create = vi.fn().mockResolvedValue(checkoutSession());
		const result = await createSession(guestCreateInput(create));

		expect(result).toHaveProperty("session");
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				cartId: "cart-1",
				subtotal: 2_500,
				total: 2_500,
				lineItems: [
					expect.objectContaining({
						productId: "product-1",
						name: "Authoritative Product",
						price: 1_250,
						quantity: 2,
						sku: "REAL-SKU",
					}),
				],
			}),
		);
	});

	it("fails before persistence when authoritative product pricing is invalid", async () => {
		const create = vi.fn();
		const result = await createSession(
			guestCreateInput(
				create,
				capabilityInvoker({ productFailure: "invalid_price" }),
			),
		);

		expect(result).toMatchObject({
			code: "CHECKOUT_PRICING_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects a Cart variant that Products cannot bind to its product", async () => {
		const create = vi.fn();
		const result = await createSession(
			guestCreateInput(
				create,
				capabilityInvoker({
					variantId: "variant-1",
					productFailure: "variant_mismatch",
				}),
			),
		);

		expect(result).toMatchObject({ status: 400 });
		expect(create).not.toHaveBeenCalled();
	});

	it("contains Checkout creation with a shipping address until Tax v2 is bound", async () => {
		const create = vi.fn();
		const capabilities = capabilityInvoker();
		const result = await createSession({
			body: { cartId: "cart-1", shippingAddress },
			context: {
				controllers: { checkout: { create } },
				capabilities,
				session: null,
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_TAX_V2_REQUIRED",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
		expect(capabilities.invoke).not.toHaveBeenCalled();
	});

	it("rejects a caller-supplied shipping amount before reading or mutating a session", async () => {
		const getById = vi.fn();
		const update = vi.fn();
		const result = await updateSession({
			params: { id: "session-1" },
			body: { expectedRevision: 1, shippingAmount: 1 },
			context: { controllers: { checkout: { getById, update } } },
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_CALLER_TOTALS_REJECTED",
			status: 422,
		});
		expect(getById).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it("contains an authorized address update until Tax v2 is bound", async () => {
		const update = vi.fn();
		const getById = vi
			.fn()
			.mockResolvedValue(checkoutSession({ customerId: "customer-1" }));
		const result = await updateSession({
			params: { id: "session-1" },
			body: { expectedRevision: 1, shippingAddress },
			context: {
				controllers: { checkout: { getById, update } },
				session: createMockSession({ userId: "customer-1" }),
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_TAX_V2_REQUIRED",
			status: 503,
		});
		expect(update).not.toHaveBeenCalled();
	});

	it("contains an authorized guest shipping quote until Shipping v2 is bound", async () => {
		const proof = await createGuestProofMetadata();
		const getLineItems = vi.fn();
		const capabilities = capabilityInvoker();
		const result = await getShippingRates({
			params: { id: "session-1" },
			headers: new Headers({
				cookie: `checkout_guest_session-1=${proof.proof}`,
			}),
			context: {
				controllers: {
					checkout: {
						getById: vi
							.fn()
							.mockResolvedValue(checkoutSession({ metadata: proof.metadata })),
						getLineItems,
					},
				},
				capabilities,
				session: null,
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_SHIPPING_QUOTE_V2_REQUIRED",
			status: 503,
		});
		expect(getLineItems).not.toHaveBeenCalled();
		expect(capabilities.invoke).not.toHaveBeenCalled();
	});

	it("does not disclose a shipping containment state to an unauthorized guest", async () => {
		const proof = await createGuestProofMetadata();
		const result = await getShippingRates({
			params: { id: "session-1" },
			headers: new Headers({
				cookie: "checkout_guest_session-1=wrong-proof",
			}),
			context: {
				controllers: {
					checkout: {
						getById: vi
							.fn()
							.mockResolvedValue(checkoutSession({ metadata: proof.metadata })),
					},
				},
				session: null,
			},
		});

		expect(result).toEqual({
			error: "Checkout session not found",
			status: 404,
		});
	});

	it("returns explicit activation unavailability without downstream effects", async () => {
		const getById = vi.fn();
		const mutate = vi.fn();
		const input = {
			params: { id: "session-1" },
			context: {
				controllers: {
					checkout: { getById, update: mutate },
					inventory: { reserve: mutate, decrement: mutate },
					orders: { create: mutate },
					payments: { confirmIntent: mutate, captureIntent: mutate },
					shipping: { purchaseLabel: mutate },
				},
			},
		};

		const results = await Promise.all([
			confirmSessionUnavailable(input),
			createPaymentUnavailable(input),
			capturePaymentUnavailable(input),
			getPaymentUnavailable(input),
			completeSessionUnavailable(input),
		]);

		for (const result of results) {
			expect(result).toMatchObject({
				code: "CHECKOUT_ACTIVATION_UNAVAILABLE",
				status: 503,
			});
		}
		expect(getById).not.toHaveBeenCalled();
		expect(mutate).not.toHaveBeenCalled();
	});

	it("does not repeat downstream effects when completion is retried", async () => {
		const downstream = vi.fn();
		const input = {
			params: { id: "session-1" },
			context: {
				controllers: {
					checkout: { getById: downstream, complete: downstream },
					inventory: { decrement: downstream },
					orders: { create: downstream },
					payments: { captureIntent: downstream },
					shipping: { purchaseLabel: downstream },
				},
			},
		};

		const first = await completeSessionUnavailable(input);
		const retry = await completeSessionUnavailable(input);

		expect(first).toMatchObject({
			code: "CHECKOUT_ACTIVATION_UNAVAILABLE",
			status: 503,
		});
		expect(retry).toMatchObject({
			code: "CHECKOUT_ACTIVATION_UNAVAILABLE",
			status: 503,
		});
		expect(downstream).not.toHaveBeenCalled();
	});
});
