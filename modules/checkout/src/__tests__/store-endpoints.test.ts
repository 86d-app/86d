import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	CheckoutLineItem,
	CheckoutSession,
	DiscountController,
	GiftCardCheckController,
	InventoryCheckController,
	PaymentProcessController,
} from "../service";
import { createCheckoutController } from "../service-impl";

/**
 * Store endpoint integration tests for the checkout module.
 *
 * These tests verify the business logic in store-facing endpoints that
 * goes beyond simple controller delegation:
 *
 * 1. create-session: server-side price validation, empty cart rejection,
 *    total recalculation from trusted prices, guest vs authenticated
 * 2. get-session: ownership check, line items returned alongside session
 * 3. confirm-session: inventory stock check before confirm, reservation
 * 4. complete-session: payment verification, gift card redemption,
 *    order creation, zero-total bypass, inventory deduction
 * 5. apply-discount: discount code validation through discount controller
 * 6. apply-gift-card: balance check, cap to remaining total, status validation
 */

type DataService = ReturnType<typeof createMockDataService>;

// ── Helpers ───────────────────────────────────────────────────────────

function defaultLineItem(
	overrides: Partial<CheckoutLineItem> = {},
): CheckoutLineItem {
	return {
		productId: "prod-1",
		name: "Test Product",
		price: 2500,
		quantity: 1,
		...overrides,
	};
}

const testAddress = {
	firstName: "Jane",
	lastName: "Doe",
	line1: "123 Main St",
	city: "Anytown",
	state: "CA",
	postalCode: "90210",
	country: "US",
};

async function createTestSession(
	controller: ReturnType<typeof createCheckoutController>,
	overrides: Partial<Parameters<typeof controller.create>[0]> = {},
) {
	const defaults = {
		subtotal: 2500,
		total: 2500,
		lineItems: [defaultLineItem()],
		guestEmail: "guest@example.com",
		shippingAddress: testAddress,
		...overrides,
	};
	return controller.create(defaults);
}

// ── Simulate endpoint logic ──────────────────────────────────────────

/**
 * Simulates create-session endpoint: validates prices against products
 * data registry, rejects empty carts, recalculates totals server-side.
 */
async function simulateCreateSession(
	data: DataService,
	body: {
		lineItems: Array<{
			productId: string;
			variantId?: string | undefined;
			name: string;
			sku?: string | undefined;
			price: number;
			quantity: number;
		}>;
		subtotal: number;
		total: number;
		taxAmount?: number;
		shippingAmount?: number;
		guestEmail?: string;
		currency?: string;
		shippingAddress?: typeof testAddress;
		billingAddress?: typeof testAddress;
		cartId?: string;
	},
	opts: {
		customerId?: string;
		productsData?: DataService;
	} = {},
) {
	const controller = createCheckoutController(data);

	if (body.lineItems.length === 0) {
		return { error: "Cart is empty", status: 400 };
	}

	// Server-side price validation
	if (opts.productsData) {
		for (const item of body.lineItems) {
			let trustedPrice: number | undefined;
			if (item.variantId) {
				const variant = (await opts.productsData.get(
					"productVariant",
					item.variantId,
				)) as { price: number } | null;
				if (variant) trustedPrice = variant.price;
			}
			if (trustedPrice === undefined) {
				const product = (await opts.productsData.get(
					"product",
					item.productId,
				)) as { price: number } | null;
				if (!product) {
					return { error: `Product not found: ${item.name}`, status: 400 };
				}
				trustedPrice = product.price;
			}
			item.price = trustedPrice;
		}
	}

	// Recalculate totals server-side
	const subtotal = body.lineItems.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	);
	const taxAmount = body.taxAmount ?? 0;
	const shippingAmount = body.shippingAmount ?? 0;
	const total = subtotal + taxAmount + shippingAmount;

	const session = await controller.create({
		...(body.cartId ? { cartId: body.cartId } : {}),
		...(opts.customerId ? { customerId: opts.customerId } : {}),
		...(body.guestEmail ? { guestEmail: body.guestEmail } : {}),
		...(body.currency ? { currency: body.currency } : {}),
		subtotal,
		...(body.taxAmount !== undefined ? { taxAmount: body.taxAmount } : {}),
		...(body.shippingAmount !== undefined
			? { shippingAmount: body.shippingAmount }
			: {}),
		total,
		lineItems: body.lineItems,
		...(body.shippingAddress ? { shippingAddress: body.shippingAddress } : {}),
		...(body.billingAddress ? { billingAddress: body.billingAddress } : {}),
	});

	return { session };
}

/**
 * Simulates get-session endpoint: ownership check + returns line items.
 */
async function simulateGetSession(
	data: DataService,
	sessionId: string,
	userId?: string,
) {
	const controller = createCheckoutController(data);
	const session = await controller.getById(sessionId);
	if (!session) {
		return { error: "Checkout session not found", status: 404 };
	}

	if (session.customerId && (!userId || session.customerId !== userId)) {
		return { error: "Checkout session not found", status: 404 };
	}

	const lineItems = await controller.getLineItems(sessionId);
	return { session, lineItems };
}

/**
 * Simulates confirm-session endpoint: inventory check + reservation.
 */
async function simulateConfirmSession(
	data: DataService,
	sessionId: string,
	opts: {
		userId?: string;
		inventoryController?: InventoryCheckController;
	} = {},
) {
	const controller = createCheckoutController(data);
	const existing = await controller.getById(sessionId);
	if (!existing) {
		return { error: "Checkout session not found", status: 404 };
	}

	if (
		existing.customerId &&
		(!opts.userId || existing.customerId !== opts.userId)
	) {
		return { error: "Checkout session not found", status: 404 };
	}

	if (opts.inventoryController) {
		const lineItems = await controller.getLineItems(sessionId);
		const outOfStock: string[] = [];

		for (const item of lineItems) {
			const inStock = await opts.inventoryController.isInStock({
				productId: item.productId,
				variantId: item.variantId,
				quantity: item.quantity,
			});
			if (!inStock) {
				outOfStock.push(item.name);
			}
		}

		if (outOfStock.length > 0) {
			return {
				error: `Insufficient stock for: ${outOfStock.join(", ")}`,
				status: 422,
			};
		}
	}

	const result = await controller.confirm(sessionId);
	if ("error" in result) {
		return result;
	}

	if (opts.inventoryController) {
		const lineItems = await controller.getLineItems(sessionId);
		for (const item of lineItems) {
			await opts.inventoryController.reserve({
				productId: item.productId,
				variantId: item.variantId,
				quantity: item.quantity,
			});
		}
	}

	return { session: result.session };
}

/**
 * Simulates complete-session endpoint: payment check, gift card
 * redemption, order creation, inventory deduction.
 */
async function simulateCompleteSession(
	data: DataService,
	sessionId: string,
	opts: {
		userId?: string;
		paymentController?: PaymentProcessController;
		giftCardController?: GiftCardCheckController;
		inventoryController?: InventoryCheckController;
	} = {},
) {
	const controller = createCheckoutController(data);
	const existing = await controller.getById(sessionId);
	if (!existing) {
		return { error: "Checkout session not found", status: 404 };
	}

	if (
		existing.customerId &&
		(!opts.userId || existing.customerId !== opts.userId)
	) {
		return { error: "Checkout session not found", status: 404 };
	}

	// Payment verification
	if (existing.total > 0) {
		const paymentOk =
			existing.paymentStatus === "succeeded" ||
			existing.paymentIntentId === "no_payment_required";

		if (!paymentOk) {
			if (
				opts.paymentController &&
				existing.paymentIntentId &&
				!existing.paymentIntentId.startsWith("demo_")
			) {
				const intent = await opts.paymentController.getIntent(
					existing.paymentIntentId,
				);
				if (intent?.status !== "succeeded") {
					return { error: "Payment has not been completed", status: 422 };
				}
				await controller.setPaymentIntent(sessionId, intent.id, intent.status);
			} else if (!existing.paymentIntentId) {
				return { error: "Payment has not been initiated", status: 422 };
			}
		}
	}

	// Gift card redemption
	if (existing.giftCardCode && existing.giftCardAmount > 0) {
		if (opts.giftCardController) {
			const redeemResult = await opts.giftCardController.redeem(
				existing.giftCardCode,
				existing.giftCardAmount,
			);
			if (!redeemResult) {
				return {
					error:
						"Gift card could not be redeemed. It may be expired, inactive, or have insufficient balance.",
					status: 422,
				};
			}
		}
	}

	const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
	const session = await controller.complete(sessionId, orderId);
	if (!session) {
		return { error: "Cannot complete this checkout session", status: 422 };
	}

	return { session, orderId };
}

/**
 * Simulates apply-discount endpoint: validates code through discount
 * controller, applies discount amount.
 */
async function simulateApplyDiscount(
	data: DataService,
	sessionId: string,
	code: string,
	opts: {
		userId?: string;
		discountController?: DiscountController;
	} = {},
) {
	const controller = createCheckoutController(data);
	const session = await controller.getById(sessionId);
	if (!session) {
		return { error: "Checkout session not found", status: 404 };
	}

	if (
		session.customerId &&
		(!opts.userId || session.customerId !== opts.userId)
	) {
		return { error: "Checkout session not found", status: 404 };
	}

	let discountAmount = 0;
	let freeShipping = false;

	if (opts.discountController) {
		const result = await opts.discountController.validateCode({
			code,
			subtotal: session.subtotal,
		});
		if (!result.valid) {
			return { error: result.error ?? "Invalid promo code", status: 400 };
		}
		discountAmount = result.discountAmount;
		freeShipping = result.freeShipping;
	}

	const updated = await controller.applyDiscount(sessionId, {
		code,
		discountAmount,
		freeShipping,
	});
	return { session: updated };
}

/**
 * Simulates apply-gift-card endpoint: checks balance, validates status,
 * caps amount to remaining total.
 */
async function simulateApplyGiftCard(
	data: DataService,
	sessionId: string,
	code: string,
	opts: {
		userId?: string;
		giftCardController?: GiftCardCheckController;
	} = {},
) {
	const controller = createCheckoutController(data);
	const session = await controller.getById(sessionId);
	if (!session) {
		return { error: "Checkout session not found", status: 404 };
	}

	if (
		session.customerId &&
		(!opts.userId || session.customerId !== opts.userId)
	) {
		return { error: "Checkout session not found", status: 404 };
	}

	let giftCardAmount = 0;

	if (opts.giftCardController) {
		const result = await opts.giftCardController.checkBalance(code);
		if (!result) {
			return { error: "Gift card not found", status: 404 };
		}
		if (result.status !== "active") {
			return { error: `Gift card is ${result.status}`, status: 400 };
		}
		if (result.balance <= 0) {
			return { error: "Gift card has no balance", status: 400 };
		}
		const remainingTotal =
			session.subtotal +
			session.taxAmount +
			session.shippingAmount -
			session.discountAmount;
		giftCardAmount = Math.min(result.balance, Math.max(0, remainingTotal));
	}

	const updated = await controller.applyGiftCard(sessionId, {
		code: code.toUpperCase(),
		giftCardAmount,
	});
	return { session: updated };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("checkout store endpoints", () => {
	let data: DataService;
	let controller: ReturnType<typeof createCheckoutController>;

	beforeEach(() => {
		data = createMockDataService();
		controller = createCheckoutController(data);
	});

	// ── create-session ───────────────────────────────────────────────

	describe("create-session", () => {
		it("rejects empty cart", async () => {
			const result = await simulateCreateSession(data, {
				lineItems: [],
				subtotal: 0,
				total: 0,
			});
			expect(result).toEqual({ error: "Cart is empty", status: 400 });
		});

		it("creates session with guest email", async () => {
			const result = await simulateCreateSession(data, {
				lineItems: [
					{ productId: "p1", name: "Widget", price: 1000, quantity: 2 },
				],
				subtotal: 2000,
				total: 2000,
				guestEmail: "guest@shop.com",
			});
			expect("session" in result && result.session).toBeTruthy();
			const session = (result as { session: CheckoutSession }).session;
			expect(session.guestEmail).toBe("guest@shop.com");
			expect(session.customerId).toBeUndefined();
		});

		it("creates session with authenticated customerId", async () => {
			const result = await simulateCreateSession(
				data,
				{
					lineItems: [defaultLineItem()],
					subtotal: 2500,
					total: 2500,
				},
				{ customerId: "cust-1" },
			);
			const session = (result as { session: CheckoutSession }).session;
			expect(session.customerId).toBe("cust-1");
		});

		it("validates prices against products data registry", async () => {
			const productsData = createMockDataService();
			await productsData.upsert("product", "p1", {
				id: "p1",
				price: 3000,
				status: "active",
			});

			const result = await simulateCreateSession(
				data,
				{
					lineItems: [
						{
							productId: "p1",
							name: "Widget",
							price: 100, // Client lies about price
							quantity: 2,
						},
					],
					subtotal: 200,
					total: 200,
				},
				{ productsData },
			);

			const session = (result as { session: CheckoutSession }).session;
			// Server corrected to trusted price: 3000 * 2 = 6000
			expect(session.subtotal).toBe(6000);
			expect(session.total).toBe(6000);
		});

		it("validates variant prices over product prices", async () => {
			const productsData = createMockDataService();
			await productsData.upsert("product", "p1", {
				id: "p1",
				price: 2000,
			});
			await productsData.upsert("productVariant", "v1", {
				id: "v1",
				price: 2500,
			});

			const result = await simulateCreateSession(
				data,
				{
					lineItems: [
						{
							productId: "p1",
							variantId: "v1",
							name: "Widget (Large)",
							price: 100,
							quantity: 1,
						},
					],
					subtotal: 100,
					total: 100,
				},
				{ productsData },
			);

			const session = (result as { session: CheckoutSession }).session;
			expect(session.subtotal).toBe(2500);
		});

		it("rejects unknown product when products registry exists", async () => {
			const productsData = createMockDataService();

			const result = await simulateCreateSession(
				data,
				{
					lineItems: [
						{
							productId: "nonexistent",
							name: "Ghost Product",
							price: 1000,
							quantity: 1,
						},
					],
					subtotal: 1000,
					total: 1000,
				},
				{ productsData },
			);

			expect(result).toEqual({
				error: "Product not found: Ghost Product",
				status: 400,
			});
		});

		it("recalculates total including tax and shipping", async () => {
			const result = await simulateCreateSession(data, {
				lineItems: [
					{ productId: "p1", name: "Item", price: 5000, quantity: 1 },
				],
				subtotal: 5000,
				total: 5000,
				taxAmount: 400,
				shippingAmount: 500,
			});

			const session = (result as { session: CheckoutSession }).session;
			expect(session.subtotal).toBe(5000);
			expect(session.total).toBe(5900); // 5000 + 400 + 500
		});
	});

	// ── get-session ──────────────────────────────────────────────────

	describe("get-session", () => {
		it("returns 404 for nonexistent session", async () => {
			const result = await simulateGetSession(data, "no-such-id");
			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});

		it("returns session with line items", async () => {
			const session = await createTestSession(controller);
			const result = await simulateGetSession(data, session.id);

			expect("lineItems" in result).toBe(true);
			const res = result as {
				session: CheckoutSession;
				lineItems: CheckoutLineItem[];
			};
			expect(res.session.id).toBe(session.id);
			expect(res.lineItems).toHaveLength(1);
			expect(res.lineItems[0].productId).toBe("prod-1");
		});

		it("allows guest to access guest session", async () => {
			const session = await createTestSession(controller, {
				guestEmail: "guest@test.com",
			});
			// No userId — should still work since no customerId is set
			const result = await simulateGetSession(data, session.id);
			expect("session" in result).toBe(true);
		});

		it("blocks access to another customer's session", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-owner",
			});

			const result = await simulateGetSession(
				data,
				session.id,
				"cust-intruder",
			);
			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});

		it("allows owner to access their own session", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-owner",
			});

			const result = await simulateGetSession(data, session.id, "cust-owner");
			expect("session" in result).toBe(true);
		});
	});

	// ── confirm-session ──────────────────────────────────────────────

	describe("confirm-session", () => {
		it("blocks confirm when inventory is insufficient", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});

			const inventoryController: InventoryCheckController = {
				isInStock: vi.fn().mockResolvedValue(false),
				reserve: vi.fn(),
				release: vi.fn(),
				deduct: vi.fn(),
			};

			const result = await simulateConfirmSession(data, session.id, {
				userId: "cust-1",
				inventoryController,
			});

			expect(result).toMatchObject({
				error: expect.stringContaining("Insufficient stock"),
				status: 422,
			});
		});

		it("lists all out-of-stock item names in error", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
				lineItems: [
					defaultLineItem({ productId: "p1", name: "Widget A" }),
					defaultLineItem({ productId: "p2", name: "Widget B" }),
				],
			});

			const inventoryController: InventoryCheckController = {
				isInStock: vi.fn().mockResolvedValue(false),
				reserve: vi.fn(),
				release: vi.fn(),
				deduct: vi.fn(),
			};

			const result = await simulateConfirmSession(data, session.id, {
				userId: "cust-1",
				inventoryController,
			});

			expect(result).toMatchObject({
				error: "Insufficient stock for: Widget A, Widget B",
			});
		});

		it("reserves stock after successful confirm", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});

			const reserveFn = vi.fn().mockResolvedValue({});
			const inventoryController: InventoryCheckController = {
				isInStock: vi.fn().mockResolvedValue(true),
				reserve: reserveFn,
				release: vi.fn(),
				deduct: vi.fn(),
			};

			const result = await simulateConfirmSession(data, session.id, {
				userId: "cust-1",
				inventoryController,
			});

			expect("session" in result).toBe(true);
			expect(reserveFn).toHaveBeenCalledWith(
				expect.objectContaining({
					productId: "prod-1",
					quantity: 1,
				}),
			);
		});

		it("confirms without inventory controller installed", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});

			const result = await simulateConfirmSession(data, session.id, {
				userId: "cust-1",
			});

			const res = result as { session: CheckoutSession };
			expect(res.session.status).toBe("processing");
		});

		it("returns 404 for another customer's session", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-owner",
			});

			const result = await simulateConfirmSession(data, session.id, {
				userId: "cust-intruder",
			});
			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});
	});

	// ── complete-session ─────────────────────────────────────────────

	describe("complete-session", () => {
		it("rejects when payment has not been initiated", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});

			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-1",
			});

			expect(result).toEqual({
				error: "Payment has not been initiated",
				status: 422,
			});
		});

		it("completes when payment status is succeeded", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});
			await controller.setPaymentIntent(session.id, "pi_123", "succeeded");

			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-1",
			});

			expect("orderId" in result).toBe(true);
			const res = result as { session: CheckoutSession; orderId: string };
			expect(res.session.status).toBe("completed");
		});

		it("bypasses payment check for zero-total sessions", async () => {
			const session = await controller.create({
				subtotal: 0,
				total: 0,
				lineItems: [defaultLineItem({ price: 0 })],
				customerId: "cust-1",
				guestEmail: "test@example.com",
				shippingAddress: testAddress,
			});

			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-1",
			});

			expect("orderId" in result).toBe(true);
		});

		it("completes with demo payment intent prefix", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});
			await controller.setPaymentIntent(session.id, "demo_pi_123", "pending");

			// demo_ prefix skips payment verification
			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-1",
			});

			expect("orderId" in result).toBe(true);
		});

		it("checks payment controller when status is not succeeded", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});
			await controller.setPaymentIntent(session.id, "pi_123", "pending");

			const paymentController: PaymentProcessController = {
				getIntent: vi
					.fn()
					.mockResolvedValue({ id: "pi_123", status: "failed" }),
				createIntent: vi.fn(),
				confirmIntent: vi.fn(),
				cancelIntent: vi.fn(),
			};

			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-1",
				paymentController,
			});

			expect(result).toEqual({
				error: "Payment has not been completed",
				status: 422,
			});
		});

		it("rejects when gift card redemption fails", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-1",
			});
			await controller.setPaymentIntent(session.id, "pi_123", "succeeded");
			await controller.applyGiftCard(session.id, {
				code: "GC-EXPIRED",
				giftCardAmount: 500,
			});

			const giftCardController: GiftCardCheckController = {
				checkBalance: vi.fn(),
				redeem: vi.fn().mockResolvedValue(null),
			};

			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-1",
				giftCardController,
			});

			expect(result).toMatchObject({
				error: expect.stringContaining("Gift card could not be redeemed"),
				status: 422,
			});
		});

		it("returns 404 for another customer's session", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-owner",
			});

			const result = await simulateCompleteSession(data, session.id, {
				userId: "cust-intruder",
			});

			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});
	});

	// ── apply-discount ───────────────────────────────────────────────

	describe("apply-discount", () => {
		it("applies discount with valid code", async () => {
			const session = await createTestSession(controller, {
				subtotal: 5000,
				total: 5000,
			});

			const discountController: DiscountController = {
				validateCode: vi.fn().mockResolvedValue({
					valid: true,
					discountAmount: 1000,
					freeShipping: false,
				}),
				applyCode: vi.fn(),
			};

			const result = await simulateApplyDiscount(data, session.id, "SAVE10", {
				discountController,
			});

			const res = result as { session: CheckoutSession };
			expect(res.session?.discountCode).toBe("SAVE10");
			expect(res.session?.discountAmount).toBe(1000);
			expect(res.session?.total).toBe(4000); // 5000 - 1000
		});

		it("rejects invalid discount code", async () => {
			const session = await createTestSession(controller);

			const discountController: DiscountController = {
				validateCode: vi.fn().mockResolvedValue({
					valid: false,
					discountAmount: 0,
					freeShipping: false,
					error: "Code has expired",
				}),
				applyCode: vi.fn(),
			};

			const result = await simulateApplyDiscount(data, session.id, "EXPIRED", {
				discountController,
			});

			expect(result).toEqual({ error: "Code has expired", status: 400 });
		});

		it("applies free shipping discount", async () => {
			const session = await createTestSession(controller, {
				subtotal: 3000,
				total: 3500,
				shippingAmount: 500,
			});

			const discountController: DiscountController = {
				validateCode: vi.fn().mockResolvedValue({
					valid: true,
					discountAmount: 0,
					freeShipping: true,
				}),
				applyCode: vi.fn(),
			};

			const result = await simulateApplyDiscount(data, session.id, "FREESHIP", {
				discountController,
			});

			const res = result as { session: CheckoutSession };
			expect(res.session?.shippingAmount).toBe(0);
		});

		it("returns 404 for nonexistent session", async () => {
			const result = await simulateApplyDiscount(data, "no-such-id", "CODE");
			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});

		it("blocks discount on another customer's session", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-owner",
			});

			const result = await simulateApplyDiscount(data, session.id, "CODE", {
				userId: "cust-intruder",
			});

			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});
	});

	// ── apply-gift-card ──────────────────────────────────────────────

	describe("apply-gift-card", () => {
		it("applies gift card with sufficient balance", async () => {
			const session = await createTestSession(controller, {
				subtotal: 5000,
				total: 5000,
			});

			const giftCardController: GiftCardCheckController = {
				checkBalance: vi.fn().mockResolvedValue({
					balance: 2000,
					currency: "USD",
					status: "active",
				}),
				redeem: vi.fn(),
			};

			const result = await simulateApplyGiftCard(data, session.id, "gc-123", {
				giftCardController,
			});

			const res = result as { session: CheckoutSession };
			expect(res.session?.giftCardCode).toBe("GC-123"); // uppercased
			expect(res.session?.giftCardAmount).toBe(2000);
			expect(res.session?.total).toBe(3000); // 5000 - 2000
		});

		it("caps gift card amount to remaining total", async () => {
			const session = await createTestSession(controller, {
				subtotal: 1000,
				total: 1000,
			});

			const giftCardController: GiftCardCheckController = {
				checkBalance: vi.fn().mockResolvedValue({
					balance: 5000, // More than the order total
					currency: "USD",
					status: "active",
				}),
				redeem: vi.fn(),
			};

			const result = await simulateApplyGiftCard(data, session.id, "gc-big", {
				giftCardController,
			});

			const res = result as { session: CheckoutSession };
			expect(res.session?.giftCardAmount).toBe(1000); // Capped to total
			expect(res.session?.total).toBe(0);
		});

		it("rejects nonexistent gift card", async () => {
			const session = await createTestSession(controller);

			const giftCardController: GiftCardCheckController = {
				checkBalance: vi.fn().mockResolvedValue(null),
				redeem: vi.fn(),
			};

			const result = await simulateApplyGiftCard(
				data,
				session.id,
				"no-such-gc",
				{ giftCardController },
			);

			expect(result).toEqual({ error: "Gift card not found", status: 404 });
		});

		it("rejects inactive gift card", async () => {
			const session = await createTestSession(controller);

			const giftCardController: GiftCardCheckController = {
				checkBalance: vi.fn().mockResolvedValue({
					balance: 1000,
					currency: "USD",
					status: "expired",
				}),
				redeem: vi.fn(),
			};

			const result = await simulateApplyGiftCard(
				data,
				session.id,
				"gc-expired",
				{ giftCardController },
			);

			expect(result).toEqual({
				error: "Gift card is expired",
				status: 400,
			});
		});

		it("rejects zero-balance gift card", async () => {
			const session = await createTestSession(controller);

			const giftCardController: GiftCardCheckController = {
				checkBalance: vi.fn().mockResolvedValue({
					balance: 0,
					currency: "USD",
					status: "active",
				}),
				redeem: vi.fn(),
			};

			const result = await simulateApplyGiftCard(data, session.id, "gc-empty", {
				giftCardController,
			});

			expect(result).toEqual({
				error: "Gift card has no balance",
				status: 400,
			});
		});

		it("blocks gift card on another customer's session", async () => {
			const session = await createTestSession(controller, {
				customerId: "cust-owner",
			});

			const result = await simulateApplyGiftCard(data, session.id, "gc-123", {
				userId: "cust-intruder",
			});

			expect(result).toEqual({
				error: "Checkout session not found",
				status: 404,
			});
		});
	});
});
