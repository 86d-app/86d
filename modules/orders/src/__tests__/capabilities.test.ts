import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import {
	orderCreateProvider,
	orderCustomerAuthorizeProvider,
	orderPurchaseVerifyProvider,
} from "../capabilities";

const providerContext = (data: ReturnType<typeof createMockDataService>) => ({
	data,
	storeId: "store-1",
	options: {},
});

describe("orders capabilities", () => {
	it("creates an order through the owning module", async () => {
		const data = createMockDataService();
		const result = await orderCreateProvider.handle(providerContext(data), {
			customerId: "customer-1",
			subtotal: 2000,
			total: 2000,
			items: [
				{
					productId: "product-1",
					name: "Tee",
					price: 2000,
					quantity: 1,
				},
			],
		});

		expect(result).toMatchObject({
			ok: true,
			decision: {
				orderId: expect.any(String),
				orderNumber: expect.any(String),
			},
		});
	});

	it("authorizes only the owning customer without exposing the order", async () => {
		const data = createMockDataService();
		const created = await orderCreateProvider.handle(providerContext(data), {
			customerId: "customer-1",
			subtotal: 2000,
			total: 2000,
			items: [
				{
					productId: "product-1",
					name: "Tee",
					price: 2000,
					quantity: 1,
				},
			],
		});
		if (!created.ok) throw new Error("order creation failed");

		await expect(
			orderCustomerAuthorizeProvider.handle(providerContext(data), {
				orderId: created.decision.orderId,
				customerId: "customer-1",
			}),
		).resolves.toEqual({ ok: true, decision: { authorized: true } });
		await expect(
			orderCustomerAuthorizeProvider.handle(providerContext(data), {
				orderId: created.decision.orderId,
				customerId: "customer-2",
			}),
		).resolves.toMatchObject({ ok: false, failure: { code: "not_owner" } });
	});

	it("returns a bounded purchase verification decision", async () => {
		const data = createMockDataService();
		await orderCreateProvider.handle(providerContext(data), {
			customerId: "customer-1",
			paymentStatus: "paid",
			subtotal: 2000,
			total: 2000,
			items: [
				{
					productId: "product-1",
					name: "Tee",
					price: 2000,
					quantity: 1,
				},
			],
		});

		await expect(
			orderPurchaseVerifyProvider.handle(providerContext(data), {
				customerId: "customer-1",
				productId: "product-1",
			}),
		).resolves.toEqual({ ok: true, decision: { verified: true } });
	});
});
