import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import type {
	CheckoutAddress,
	CheckoutLineItem,
	CheckoutSession,
	TaxCalculateController,
} from "../service";
import { createCheckoutController } from "../service-impl";
import { recalculateTax } from "../store/endpoints/recalculate-tax";

// ---------------------------------------------------------------------------
// Mock tax controller — records calls, applies configurable flat rate
// ---------------------------------------------------------------------------

interface TaxCalculateParams {
	address: {
		country: string;
		state: string;
		city?: string | undefined;
		postalCode?: string | undefined;
	};
	lineItems: Array<{
		productId: string;
		amount: number;
		quantity: number;
	}>;
	shippingAmount?: number | undefined;
	customerId?: string | undefined;
}

function createMockTaxController(taxRate = 0.1) {
	const calls: TaxCalculateParams[] = [];

	const controller: TaxCalculateController & {
		_calls: TaxCalculateParams[];
	} = {
		_calls: calls,
		async calculate(params) {
			calls.push(params);
			const subtotal = params.lineItems.reduce(
				(sum, item) => sum + item.amount,
				0,
			);
			const totalTax = Math.round(subtotal * taxRate);
			return {
				totalTax,
				shippingTax: 0,
				lineItems: params.lineItems.map((item) => ({
					productId: item.productId,
					taxableAmount: item.amount,
					taxAmount: Math.round(item.amount * taxRate),
					rate: taxRate,
				})),
			};
		},
	};

	return controller;
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

// ---------------------------------------------------------------------------
// Helper to create a session with known state
// ---------------------------------------------------------------------------

async function createSessionWithDiscount(
	ctrl: ReturnType<typeof createCheckoutController>,
	overrides: Partial<{
		discountAmount: number;
		discountCode: string;
		shippingAddress: CheckoutAddress;
		shippingAmount: number;
		taxAmount: number;
	}> = {},
) {
	const session = await ctrl.create({
		subtotal: 4000,
		total: 4000,
		lineItems: sampleLineItems,
		shippingAddress: overrides.shippingAddress ?? sampleAddress,
		shippingAmount: overrides.shippingAmount ?? 500,
		taxAmount: overrides.taxAmount ?? 0,
	});

	if (overrides.discountAmount) {
		await ctrl.applyDiscount(session.id, {
			code: overrides.discountCode ?? "SAVE",
			discountAmount: overrides.discountAmount,
			freeShipping: false,
		});
	}

	// Re-fetch to get current state
	const current = await ctrl.getById(session.id);
	return current as CheckoutSession;
}

// ---------------------------------------------------------------------------
// recalculateTax — core helper tests
// ---------------------------------------------------------------------------

describe("recalculateTax", () => {
	it("returns original session when no tax controller", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await createSessionWithDiscount(ctrl);

		const result = await recalculateTax(session, ctrl, undefined);
		expect(result).toBe(session);
	});

	it("returns original session when no shipping address", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create({
			subtotal: 4000,
			total: 4000,
			lineItems: sampleLineItems,
		});
		const taxCtrl = createMockTaxController(0.1);

		const result = await recalculateTax(session, ctrl, taxCtrl);
		expect(result).toBe(session);
		expect(taxCtrl._calls).toHaveLength(0);
	});

	it("calculates tax on full line item amounts when no discount", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await createSessionWithDiscount(ctrl);
		const taxCtrl = createMockTaxController(0.1);

		const result = await recalculateTax(session, ctrl, taxCtrl);

		// No discount → full amounts: p1=2000, p2=2000 → subtotal 4000 → tax 400
		expect(result.taxAmount).toBe(400);
		expect(taxCtrl._calls[0].lineItems).toEqual([
			{ productId: "p1", amount: 2000, quantity: 2 },
			{ productId: "p2", amount: 2000, quantity: 1 },
		]);
	});

	it("distributes discount proportionally across line items for tax", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// subtotal=4000, discount=1000 → 25% off each line item
		const session = await createSessionWithDiscount(ctrl, {
			discountAmount: 1000,
		});
		const taxCtrl = createMockTaxController(0.1);

		const result = await recalculateTax(session, ctrl, taxCtrl);

		// 25% off: p1=2000*0.75=1500, p2=2000*0.75=1500 → subtotal 3000 → tax 300
		expect(result.taxAmount).toBe(300);
		expect(taxCtrl._calls[0].lineItems).toEqual([
			{ productId: "p1", amount: 1500, quantity: 2 },
			{ productId: "p2", amount: 1500, quantity: 1 },
		]);
	});

	it("handles 50% discount correctly", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// subtotal=4000, discount=2000 → 50% off
		const session = await createSessionWithDiscount(ctrl, {
			discountAmount: 2000,
		});
		const taxCtrl = createMockTaxController(0.1);

		const result = await recalculateTax(session, ctrl, taxCtrl);

		// 50% off: p1=1000, p2=1000 → subtotal 2000 → tax 200
		expect(result.taxAmount).toBe(200);
		expect(taxCtrl._calls[0].lineItems).toEqual([
			{ productId: "p1", amount: 1000, quantity: 2 },
			{ productId: "p2", amount: 1000, quantity: 1 },
		]);
	});

	it("handles 100% discount (zero taxable amounts)", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await createSessionWithDiscount(ctrl, {
			discountAmount: 4000,
		});
		const taxCtrl = createMockTaxController(0.1);

		const result = await recalculateTax(session, ctrl, taxCtrl);

		// 100% off → all amounts 0 → tax 0
		expect(result.taxAmount).toBe(0);
		expect(taxCtrl._calls[0].lineItems).toEqual([
			{ productId: "p1", amount: 0, quantity: 2 },
			{ productId: "p2", amount: 0, quantity: 1 },
		]);
	});

	it("updates total correctly after tax recalculation", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await createSessionWithDiscount(ctrl, {
			discountAmount: 1000,
			shippingAmount: 500,
		});
		const taxCtrl = createMockTaxController(0.1);

		const result = await recalculateTax(session, ctrl, taxCtrl);

		// subtotal=4000, tax=300, shipping=500, discount=1000
		// total = 4000 + 300 + 500 - 1000 = 3800
		expect(result.taxAmount).toBe(300);
		expect(result.total).toBe(3800);
	});

	it("passes shipping amount and customerId to tax controller", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create({
			subtotal: 4000,
			total: 4000,
			lineItems: sampleLineItems,
			shippingAddress: sampleAddress,
			shippingAmount: 800,
			customerId: "cust-789",
		});
		const taxCtrl = createMockTaxController(0.1);

		await recalculateTax(session, ctrl, taxCtrl);

		expect(taxCtrl._calls[0].shippingAmount).toBe(800);
		expect(taxCtrl._calls[0].customerId).toBe("cust-789");
	});
});

// ---------------------------------------------------------------------------
// Discount → tax recalculation integration flow
// ---------------------------------------------------------------------------

describe("apply/remove discount tax recalculation flow", () => {
	it("tax decreases when discount is applied", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const taxCtrl = createMockTaxController(0.1);

		// Create session with tax already calculated (no discount)
		const session = await createSessionWithDiscount(ctrl);
		const withTax = await recalculateTax(session, ctrl, taxCtrl);
		expect(withTax.taxAmount).toBe(400); // 10% of 4000

		// Apply 25% discount
		const discounted = await ctrl.applyDiscount(withTax.id, {
			code: "SAVE25",
			discountAmount: 1000,
			freeShipping: false,
		});

		// Recalculate tax (simulates what the endpoint now does)
		const afterDiscount = await recalculateTax(
			discounted as CheckoutSession,
			ctrl,
			taxCtrl,
		);

		// Tax should be 10% of 3000 (post-discount) = 300
		expect(afterDiscount.taxAmount).toBe(300);
	});

	it("tax restores when discount is removed", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const taxCtrl = createMockTaxController(0.1);

		// Create session, apply discount, calculate tax
		const session = await createSessionWithDiscount(ctrl, {
			discountAmount: 1000,
		});
		const withDiscountTax = await recalculateTax(session, ctrl, taxCtrl);
		expect(withDiscountTax.taxAmount).toBe(300); // 10% of 3000

		// Remove discount
		const noDiscount = await ctrl.removeDiscount(withDiscountTax.id);

		// Recalculate tax (simulates what the endpoint now does)
		const afterRemove = await recalculateTax(
			noDiscount as CheckoutSession,
			ctrl,
			taxCtrl,
		);

		// Tax should be restored: 10% of 4000 = 400
		expect(afterRemove.taxAmount).toBe(400);
	});

	it("total is correct through full apply-tax-remove-tax cycle", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const taxCtrl = createMockTaxController(0.1);

		// 1. Create session: subtotal=4000, shipping=500
		const session = await createSessionWithDiscount(ctrl, {
			shippingAmount: 500,
		});

		// 2. Initial tax: 10% of 4000 = 400
		const step1 = await recalculateTax(session, ctrl, taxCtrl);
		expect(step1.total).toBe(4900); // 4000 + 400 + 500

		// 3. Apply $500 discount
		const discounted = await ctrl.applyDiscount(step1.id, {
			code: "SAVE5",
			discountAmount: 500,
			freeShipping: false,
		});

		// 4. Recalc tax: 10% of 3500 = 350
		const step2 = await recalculateTax(
			discounted as CheckoutSession,
			ctrl,
			taxCtrl,
		);
		expect(step2.taxAmount).toBe(350);
		// total = 4000 + 350 + 500 - 500 = 4350
		expect(step2.total).toBe(4350);

		// 5. Remove discount
		const removed = await ctrl.removeDiscount(step2.id);
		const step3 = await recalculateTax(
			removed as CheckoutSession,
			ctrl,
			taxCtrl,
		);
		// Back to original: tax=400, total=4900
		expect(step3.taxAmount).toBe(400);
		expect(step3.total).toBe(4900);
	});

	it("free shipping discount recalculates tax with zero shipping", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const taxCtrl = createMockTaxController(0.1);

		const session = await createSessionWithDiscount(ctrl, {
			shippingAmount: 500,
		});
		const withTax = await recalculateTax(session, ctrl, taxCtrl);

		// Apply free shipping discount
		const discounted = await ctrl.applyDiscount(withTax.id, {
			code: "FREESHIP",
			discountAmount: 0,
			freeShipping: true,
		});

		const afterDiscount = await recalculateTax(
			discounted as CheckoutSession,
			ctrl,
			taxCtrl,
		);

		// Shipping set to 0 by freeShipping flag
		expect(afterDiscount.shippingAmount).toBe(0);
		// Tax unchanged (no discount amount, just free shipping)
		expect(afterDiscount.taxAmount).toBe(400);
		// Shipping amount passed to tax controller should be 0
		const lastCall = taxCtrl._calls[taxCtrl._calls.length - 1];
		expect(lastCall.shippingAmount).toBe(0);
	});
});
