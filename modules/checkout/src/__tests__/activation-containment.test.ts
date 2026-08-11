import { describe, expect, it, vi } from "vitest";
import { storeEndpoints } from "../store/endpoints";

type Endpoint = (input: Record<string, unknown>) => Promise<unknown>;

function endpoint(path: keyof typeof storeEndpoints): Endpoint {
	return storeEndpoints[path] as unknown as Endpoint;
}

const lineItem = {
	productId: "product-1",
	name: "Forged Product Name",
	price: 1,
	quantity: 2,
};

const shippingAddress = {
	firstName: "Ada",
	lastName: "Lovelace",
	line1: "123 Main St",
	city: "Austin",
	state: "TX",
	postalCode: "78701",
	country: "US",
};

function productRegistry() {
	return new Map([
		[
			"products",
			{
				get: vi.fn().mockResolvedValue({
					id: "product-1",
					name: "Product",
					price: 1250,
					status: "active",
				}),
			},
		],
	]);
}

describe("checkout activation containment", () => {
	it("fails before creating a session when authoritative product data is unavailable", async () => {
		const create = vi.fn();
		const result = await endpoint("/checkout/sessions")({
			body: {
				subtotal: 2,
				total: 2,
				lineItems: [lineItem],
			},
			context: { controllers: { checkout: { create } } },
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_PRICING_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("derives product identity and price from authoritative Store data", async () => {
		const create = vi.fn(async (input) => ({ id: "session-1", ...input }));
		const productsData = {
			get: vi.fn(async (entity: string) => {
				if (entity === "product") {
					return {
						id: "product-1",
						name: "Authoritative Product",
						price: 1250,
						sku: "REAL-SKU",
						status: "active",
					};
				}
				return null;
			}),
		};

		const result = await endpoint("/checkout/sessions")({
			body: {
				subtotal: 2,
				total: 2,
				lineItems: [lineItem],
			},
			context: {
				controllers: { checkout: { create } },
				_dataRegistry: new Map([["products", productsData]]),
			},
		});

		expect(result).toHaveProperty("session");
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				subtotal: 2500,
				total: 2500,
				lineItems: [
					expect.objectContaining({
						name: "Authoritative Product",
						price: 1250,
						sku: "REAL-SKU",
					}),
				],
			}),
		);
	});

	it("fails before persistence when authoritative product pricing is missing", async () => {
		const create = vi.fn();
		const result = await endpoint("/checkout/sessions")({
			body: {
				subtotal: 2,
				total: 2,
				lineItems: [lineItem],
			},
			context: {
				controllers: { checkout: { create } },
				_dataRegistry: new Map([
					[
						"products",
						{
							get: vi.fn().mockResolvedValue({
								id: "product-1",
								name: "Product",
								status: "active",
							}),
						},
					],
				]),
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_PRICING_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects a variant that does not belong to the selected product", async () => {
		const create = vi.fn();
		const productsData = {
			get: vi.fn(async (entity: string) => {
				if (entity === "product") {
					return {
						id: "product-1",
						name: "Product",
						price: 1250,
						status: "active",
					};
				}
				return {
					id: "variant-1",
					productId: "product-2",
					name: "Other Product Variant",
					price: 1500,
				};
			}),
		};

		const result = await endpoint("/checkout/sessions")({
			body: {
				subtotal: 2,
				total: 2,
				lineItems: [{ ...lineItem, variantId: "variant-1" }],
			},
			context: {
				controllers: { checkout: { create } },
				_dataRegistry: new Map([["products", productsData]]),
			},
		});

		expect(result).toMatchObject({ status: 400 });
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects caller-supplied tax and shipping amounts before persistence", async () => {
		const create = vi.fn();
		const productsData = {
			get: vi.fn().mockResolvedValue({
				id: "product-1",
				name: "Product",
				price: 1250,
				status: "active",
			}),
		};

		const result = await endpoint("/checkout/sessions")({
			body: {
				subtotal: 2,
				taxAmount: 1,
				shippingAmount: 1,
				total: 4,
				lineItems: [lineItem],
			},
			context: {
				controllers: { checkout: { create } },
				_dataRegistry: new Map([["products", productsData]]),
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_CALLER_TOTALS_REJECTED",
			status: 422,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects a caller-supplied shipping amount on session update", async () => {
		const getById = vi.fn();
		const update = vi.fn();
		const result = await endpoint("/checkout/sessions/:id/update")({
			params: { id: "session-1" },
			body: { shippingAmount: 1 },
			context: { controllers: { checkout: { getById, update } } },
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_CALLER_TOTALS_REJECTED",
			status: 422,
		});
		expect(getById).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it("fails before an address update when the required tax decision is unavailable", async () => {
		const update = vi.fn();
		const result = await endpoint("/checkout/sessions/:id/update")({
			params: { id: "session-1" },
			body: { shippingAddress },
			context: {
				controllers: {
					checkout: {
						getById: vi.fn().mockResolvedValue({
							id: "session-1",
							customerId: undefined,
						}),
						update,
					},
				},
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_TAX_UNAVAILABLE",
			status: 503,
		});
		expect(update).not.toHaveBeenCalled();
	});

	it("fails before session persistence when a required tax decision is unavailable", async () => {
		const create = vi.fn();
		const result = await endpoint("/checkout/sessions")({
			body: {
				subtotal: 2,
				total: 2,
				lineItems: [lineItem],
				shippingAddress,
			},
			context: {
				controllers: { checkout: { create } },
				_dataRegistry: productRegistry(),
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_TAX_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("does not report an empty shipping decision when the shipping service is missing", async () => {
		const getLineItems = vi.fn();
		const result = await endpoint("/checkout/sessions/:id/shipping-rates")({
			params: { id: "session-1" },
			context: {
				controllers: {
					checkout: {
						getById: vi.fn().mockResolvedValue({
							id: "session-1",
							shippingAddress,
						}),
						getLineItems,
					},
				},
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_SHIPPING_UNAVAILABLE",
			status: 503,
		});
		expect(getLineItems).not.toHaveBeenCalled();
	});

	it.each([
		"/checkout/sessions/:id/confirm",
		"/checkout/sessions/:id/payment",
		"/checkout/sessions/:id/payment/capture",
		"/checkout/sessions/:id/payment/status",
		"/checkout/sessions/:id/complete",
	] as const)("returns explicit unavailability without downstream effects for %s", async (path) => {
		const getById = vi.fn();
		const mutate = vi.fn();
		const result = await endpoint(path)({
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
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_ACTIVATION_UNAVAILABLE",
			status: 503,
		});
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

		const first = await endpoint("/checkout/sessions/:id/complete")(input);
		const retry = await endpoint("/checkout/sessions/:id/complete")(input);

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
