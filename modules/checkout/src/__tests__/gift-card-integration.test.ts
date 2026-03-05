import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import type { CheckoutLineItem } from "../service";
import { createCheckoutController } from "../service-impl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleLineItems: CheckoutLineItem[] = [
	{ productId: "p1", name: "Widget", price: 1000, quantity: 2 },
	{ productId: "p2", name: "Gadget", price: 2000, quantity: 1 },
];

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		subtotal: 4000,
		taxAmount: 400,
		shippingAmount: 500,
		total: 4900,
		lineItems: sampleLineItems,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// applyGiftCard
// ---------------------------------------------------------------------------

describe("applyGiftCard", () => {
	it("applies gift card amount and recalculates total", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// subtotal=4000 tax=400 shipping=500 total=4900
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.applyGiftCard(session.id, {
			code: "GIFT-ABCD-EFGH-JKLM",
			giftCardAmount: 1500,
		});

		expect(updated?.giftCardCode).toBe("GIFT-ABCD-EFGH-JKLM");
		expect(updated?.giftCardAmount).toBe(1500);
		// 4000 + 400 + 500 - 0 (discount) - 1500 (gift card) = 3400
		expect(updated?.total).toBe(3400);
	});

	it("clamps total to zero (no negative totals)", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.applyGiftCard(session.id, {
			code: "BIG-CARD",
			giftCardAmount: 99999,
		});

		expect(updated?.giftCardAmount).toBe(99999);
		expect(updated?.total).toBe(0);
	});

	it("works alongside a discount (both deductions stack)", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());

		// Apply discount first
		await ctrl.applyDiscount(session.id, {
			code: "SAVE500",
			discountAmount: 500,
			freeShipping: false,
		});

		// Then apply gift card
		const updated = await ctrl.applyGiftCard(session.id, {
			code: "GIFT-1234",
			giftCardAmount: 1000,
		});

		expect(updated?.discountAmount).toBe(500);
		expect(updated?.giftCardAmount).toBe(1000);
		// 4000 + 400 + 500 - 500 - 1000 = 3400
		expect(updated?.total).toBe(3400);
	});

	it("returns null for a completed session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.complete(session.id, "order-1");
		const result = await ctrl.applyGiftCard(session.id, {
			code: "X",
			giftCardAmount: 100,
		});
		expect(result).toBeNull();
	});

	it("returns null for a missing session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const result = await ctrl.applyGiftCard("ghost", {
			code: "X",
			giftCardAmount: 100,
		});
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// removeGiftCard
// ---------------------------------------------------------------------------

describe("removeGiftCard", () => {
	it("removes gift card and restores original total", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.applyGiftCard(session.id, {
			code: "GIFT-1234",
			giftCardAmount: 1500,
		});

		const restored = await ctrl.removeGiftCard(session.id);

		expect(restored?.giftCardCode).toBeUndefined();
		expect(restored?.giftCardAmount).toBe(0);
		// subtotal=4000 + tax=400 + shipping=500 = 4900
		expect(restored?.total).toBe(4900);
	});

	it("preserves discount when removing gift card", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());

		await ctrl.applyDiscount(session.id, {
			code: "SAVE500",
			discountAmount: 500,
			freeShipping: false,
		});
		await ctrl.applyGiftCard(session.id, {
			code: "GIFT-1234",
			giftCardAmount: 1000,
		});

		const restored = await ctrl.removeGiftCard(session.id);

		expect(restored?.discountCode).toBe("SAVE500");
		expect(restored?.discountAmount).toBe(500);
		expect(restored?.giftCardCode).toBeUndefined();
		expect(restored?.giftCardAmount).toBe(0);
		// 4000 + 400 + 500 - 500 = 4400
		expect(restored?.total).toBe(4400);
	});

	it("returns null for a missing session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		expect(await ctrl.removeGiftCard("nope")).toBeNull();
	});

	it("returns null for a completed session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.complete(session.id, "order-1");
		expect(await ctrl.removeGiftCard(session.id)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Gift card amount preserves across discount operations
// ---------------------------------------------------------------------------

describe("discount + gift card interaction", () => {
	it("applyDiscount preserves gift card amount in total", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());

		// Apply gift card first
		await ctrl.applyGiftCard(session.id, {
			code: "GIFT-1234",
			giftCardAmount: 1000,
		});

		// Then apply discount
		const updated = await ctrl.applyDiscount(session.id, {
			code: "SAVE500",
			discountAmount: 500,
			freeShipping: false,
		});

		// 4000 + 400 + 500 - 500 - 1000 = 3400
		expect(updated?.total).toBe(3400);
	});

	it("removeDiscount preserves gift card amount in total", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());

		await ctrl.applyGiftCard(session.id, {
			code: "GIFT-1234",
			giftCardAmount: 1000,
		});
		await ctrl.applyDiscount(session.id, {
			code: "SAVE500",
			discountAmount: 500,
			freeShipping: false,
		});

		const restored = await ctrl.removeDiscount(session.id);

		expect(restored?.giftCardAmount).toBe(1000);
		// 4000 + 400 + 500 - 0 - 1000 = 3900
		expect(restored?.total).toBe(3900);
	});

	it("shipping recalculation preserves gift card amount", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());

		await ctrl.applyGiftCard(session.id, {
			code: "GIFT-1234",
			giftCardAmount: 1000,
		});

		const updated = await ctrl.update(session.id, { shippingAmount: 1000 });

		// 4000 + 400 + 1000 - 0 - 1000 = 4400
		expect(updated?.total).toBe(4400);
	});
});

// ---------------------------------------------------------------------------
// giftCardAmount in create
// ---------------------------------------------------------------------------

describe("create with giftCardAmount", () => {
	it("initializes giftCardAmount to 0 by default", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		expect(session.giftCardAmount).toBe(0);
	});

	it("accepts giftCardAmount in create params", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession({ giftCardAmount: 500 }));
		expect(session.giftCardAmount).toBe(500);
	});
});
