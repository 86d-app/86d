import { describe, expect, it, vi } from "vitest";
import { storeEndpoints } from "../store/endpoints";

type Endpoint = (input: Record<string, unknown>) => Promise<unknown>;

const createSession = storeEndpoints[
	"/checkout/sessions"
] as unknown as Endpoint;

const body = {
	subtotal: 1,
	total: 1,
	lineItems: [
		{
			productId: "product-1",
			name: "Caller Name",
			price: 1,
			quantity: 2,
		},
	],
};

describe("checkout capability decisions", () => {
	it("creates a session from the Products capability decision", async () => {
		const create = vi.fn(async (input) => ({ id: "session-1", ...input }));
		const invoke = vi.fn(async (definition: { name: string }) => {
			if (definition.name === "catalog.product.resolve") {
				return {
					ok: true,
					decision: {
						product: {
							id: "product-1",
							name: "Authoritative Product",
							slug: "authoritative-product",
							status: "active",
							price: 1250,
							sku: "REAL-SKU",
							images: [],
						},
					},
				};
			}
			return { ok: false, failure: { code: "CAPABILITY_UNAVAILABLE" } };
		});

		const result = await createSession({
			body,
			context: {
				controllers: { checkout: { create } },
				capabilities: { invoke },
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

	it("fails before persistence when the required Products decision is unavailable", async () => {
		const create = vi.fn();
		const result = await createSession({
			body,
			context: {
				controllers: { checkout: { create } },
				capabilities: {
					invoke: vi.fn().mockResolvedValue({
						ok: false,
						failure: { code: "CAPABILITY_UNAVAILABLE" },
					}),
				},
			},
		});

		expect(result).toMatchObject({
			code: "CHECKOUT_PRICING_UNAVAILABLE",
			status: 503,
		});
		expect(create).not.toHaveBeenCalled();
	});
});
