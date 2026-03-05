import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import type { CheckoutAddress, CheckoutLineItem } from "../service";
import { createCheckoutController } from "../service-impl";

// ---------------------------------------------------------------------------
// Mock tax controller
// ---------------------------------------------------------------------------

interface TaxCalculateParams {
	address: {
		country: string;
		state: string;
		city: string;
		postalCode: string;
	};
	lineItems: Array<{
		productId: string;
		amount: number;
		quantity: number;
	}>;
	shippingAmount?: number | undefined;
	customerId?: string | undefined;
}

/**
 * Creates a mock tax controller that records calls and returns a
 * configurable tax amount. Mirrors the TaxController.calculate contract.
 */
function createMockTaxController(taxRate = 0.1) {
	// biome-ignore lint/suspicious/noExplicitAny: test spy accumulates heterogeneous call records
	const calls: any[] = [];

	return {
		_calls: calls,
		async calculate(params: TaxCalculateParams) {
			calls.push(params);
			const subtotal = params.lineItems.reduce(
				(sum, item) => sum + item.amount,
				0,
			);
			const totalTax = Math.round(subtotal * taxRate);
			return { totalTax };
		},
	};
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleLineItems: CheckoutLineItem[] = [
	{ productId: "p1", name: "Widget", price: 1000, quantity: 2 },
	{
		productId: "p2",
		variantId: "v1",
		name: "Gadget S",
		sku: "GAD-S",
		price: 2000,
		quantity: 1,
	},
];

const sampleAddress: CheckoutAddress = {
	firstName: "Jane",
	lastName: "Doe",
	line1: "1 Main St",
	city: "Springfield",
	state: "IL",
	postalCode: "62701",
	country: "US",
};

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		subtotal: 4000,
		taxAmount: 0,
		shippingAmount: 500,
		total: 4500,
		lineItems: sampleLineItems,
		...overrides,
	};
}

/**
 * Simulates the endpoint-level tax auto-calculation that happens in
 * update-session.ts when a shipping address or shipping amount changes.
 * This mirrors the logic in the endpoint handler without needing HTTP.
 */
async function simulateUpdateWithTax(
	ctrl: ReturnType<typeof createCheckoutController>,
	data: ReturnType<typeof createMockDataService>,
	// biome-ignore lint/suspicious/noExplicitAny: optional tax controller for testing
	taxController: any | undefined,
	sessionId: string,
	updates: {
		shippingAddress?: CheckoutAddress | undefined;
		shippingAmount?: number | undefined;
		guestEmail?: string | undefined;
	},
) {
	let session = await ctrl.update(sessionId, updates);
	if (!session) return null;

	// Mirror the endpoint logic: auto-calculate tax when address or shipping changes
	if (
		(updates.shippingAddress || updates.shippingAmount !== undefined) &&
		session.shippingAddress
	) {
		if (taxController?.calculate) {
			const lineItems = await ctrl.getLineItems(session.id);
			const taxResult = await taxController.calculate({
				address: {
					country: session.shippingAddress.country,
					state: session.shippingAddress.state,
					city: session.shippingAddress.city,
					postalCode: session.shippingAddress.postalCode,
				},
				lineItems: lineItems.map(
					(item: { productId: string; price: number; quantity: number }) => ({
						productId: item.productId,
						amount: item.price * item.quantity,
						quantity: item.quantity,
					}),
				),
				shippingAmount: session.shippingAmount,
				customerId: session.customerId,
			});

			if (taxResult && typeof taxResult.totalTax === "number") {
				const taxAmount = taxResult.totalTax;
				const total =
					session.subtotal +
					taxAmount +
					session.shippingAmount -
					session.discountAmount -
					session.giftCardAmount;

				const updated = {
					...session,
					taxAmount,
					total: Math.max(0, total),
					updatedAt: new Date(),
				};
				await data.upsert(
					"checkoutSession",
					session.id,
					// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
					updated as any,
				);
				session = updated;
			}
		}
	}

	return session;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("update-session tax auto-calculation", () => {
	it("calculates tax when shipping address is provided", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.1); // 10% tax

		const session = await ctrl.create(makeSession());
		const updated = await simulateUpdateWithTax(
			ctrl,
			data,
			taxCtrl,
			session.id,
			{ shippingAddress: sampleAddress },
		);

		expect(updated).not.toBeNull();
		// Line items: p1 = 1000*2 = 2000, p2 = 2000*1 = 2000 → subtotal 4000
		// 10% tax on 4000 = 400
		expect(updated?.taxAmount).toBe(400);
		// total = subtotal(4000) + tax(400) + shipping(500) - discount(0) - giftCard(0) = 4900
		expect(updated?.total).toBe(4900);
	});

	it("passes correct address to tax controller", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.08);

		const session = await ctrl.create(makeSession());
		await simulateUpdateWithTax(ctrl, data, taxCtrl, session.id, {
			shippingAddress: sampleAddress,
		});

		expect(taxCtrl._calls).toHaveLength(1);
		expect(taxCtrl._calls[0].address).toEqual({
			country: "US",
			state: "IL",
			city: "Springfield",
			postalCode: "62701",
		});
	});

	it("passes line items with correct amounts to tax controller", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.05);

		const session = await ctrl.create(makeSession());
		await simulateUpdateWithTax(ctrl, data, taxCtrl, session.id, {
			shippingAddress: sampleAddress,
		});

		expect(taxCtrl._calls[0].lineItems).toEqual([
			{ productId: "p1", amount: 2000, quantity: 2 },
			{ productId: "p2", amount: 2000, quantity: 1 },
		]);
	});

	it("recalculates tax when shipping amount changes", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.1);

		// Create session with address already set
		const session = await ctrl.create(
			makeSession({ shippingAddress: sampleAddress }),
		);

		const updated = await simulateUpdateWithTax(
			ctrl,
			data,
			taxCtrl,
			session.id,
			{ shippingAmount: 800 },
		);

		expect(updated).not.toBeNull();
		expect(updated?.taxAmount).toBe(400);
		expect(updated?.shippingAmount).toBe(800);
		// total = 4000 + 400 + 800 - 0 - 0 = 5200
		expect(updated?.total).toBe(5200);
		// Includes shipping amount in tax call
		expect(taxCtrl._calls[0].shippingAmount).toBe(800);
	});

	it("skips tax calculation when no tax controller", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);

		const session = await ctrl.create(makeSession());
		const updated = await simulateUpdateWithTax(
			ctrl,
			data,
			undefined,
			session.id,
			{ shippingAddress: sampleAddress },
		);

		expect(updated).not.toBeNull();
		// Tax unchanged (remains 0 from creation)
		expect(updated?.taxAmount).toBe(0);
		expect(updated?.total).toBe(4500);
	});

	it("skips tax calculation when address has not been set", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.1);

		const session = await ctrl.create(makeSession());
		// Only update email — no address trigger
		const updated = await simulateUpdateWithTax(
			ctrl,
			data,
			taxCtrl,
			session.id,
			{ guestEmail: "test@example.com" },
		);

		expect(updated).not.toBeNull();
		expect(taxCtrl._calls).toHaveLength(0);
		expect(updated?.taxAmount).toBe(0);
	});

	it("accounts for discounts in total calculation", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.1);

		// Apply a discount first
		const session = await ctrl.create(makeSession());
		await ctrl.applyDiscount(session.id, {
			code: "SAVE10",
			discountAmount: 500,
			freeShipping: false,
		});

		const updated = await simulateUpdateWithTax(
			ctrl,
			data,
			taxCtrl,
			session.id,
			{ shippingAddress: sampleAddress },
		);

		expect(updated?.taxAmount).toBe(400);
		// total = 4000 + 400 + 500 - 500 - 0 = 4400
		expect(updated?.total).toBe(4400);
	});

	it("ensures total never goes below zero", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.01); // very low tax

		// Create session with huge discount
		const session = await ctrl.create(
			makeSession({
				subtotal: 100,
				total: 0,
				discountAmount: 100,
				shippingAmount: 0,
			}),
		);
		await ctrl.applyGiftCard(session.id, {
			code: "GIFT",
			giftCardAmount: 50,
		});

		const updated = await simulateUpdateWithTax(
			ctrl,
			data,
			taxCtrl,
			session.id,
			{ shippingAddress: sampleAddress },
		);

		expect(updated).not.toBeNull();
		expect(updated?.total).toBeGreaterThanOrEqual(0);
	});

	it("passes customerId to tax controller when available", async () => {
		const data = createMockDataService();
		const ctrl = createCheckoutController(data);
		const taxCtrl = createMockTaxController(0.1);

		const session = await ctrl.create(makeSession({ customerId: "cust-123" }));
		await simulateUpdateWithTax(ctrl, data, taxCtrl, session.id, {
			shippingAddress: sampleAddress,
		});

		expect(taxCtrl._calls[0].customerId).toBe("cust-123");
	});
});
