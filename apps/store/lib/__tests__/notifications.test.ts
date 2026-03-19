import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all email template imports
vi.mock("emails/back-in-stock", () => ({
	default: vi.fn(() => "BackInStockEmail"),
}));
vi.mock("emails/delivery-confirmation", () => ({
	default: vi.fn(() => "DeliveryConfirmation"),
}));
vi.mock("emails/low-stock-alert", () => ({
	default: vi.fn(() => "LowStockAlert"),
}));
vi.mock("emails/order-cancelled", () => ({
	default: vi.fn(() => "OrderCancelled"),
}));
vi.mock("emails/order-completed", () => ({
	default: vi.fn(() => "OrderCompleted"),
}));
vi.mock("emails/order-confirmation", () => ({
	default: vi.fn(() => "OrderConfirmation"),
}));
vi.mock("emails/payment-failed", () => ({
	default: vi.fn(() => "PaymentFailed"),
}));
vi.mock("emails/refund-processed", () => ({
	default: vi.fn(() => "RefundProcessed"),
}));
vi.mock("emails/return-approved", () => ({
	default: vi.fn(() => "ReturnApproved"),
}));
vi.mock("emails/review-request", () => ({
	default: vi.fn(() => "ReviewRequest"),
}));
vi.mock("emails/shipping-notification", () => ({
	default: vi.fn(() => "ShippingNotification"),
}));
vi.mock("emails/subscription-cancel", () => ({
	default: vi.fn(() => "SubscriptionCancel"),
}));
vi.mock("emails/subscription-complete", () => ({
	default: vi.fn(() => "SubscriptionComplete"),
}));
vi.mock("emails/subscription-update", () => ({
	default: vi.fn(() => "SubscriptionUpdate"),
}));
vi.mock("emails/welcome", () => ({ default: vi.fn(() => "WelcomeEmail") }));
vi.mock("lib/carrier-tracking", () => ({
	getTrackingUrl: vi.fn((carrier: string, num: string) =>
		carrier === "fedex" ? `https://fedex.com/track/${num}` : null,
	),
}));
vi.mock("utils/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { registerNotificationHandlers } from "../notifications";

// ── Helpers ──────────────────────────────────────────────────────────

function createMockBus() {
	const handlers = new Map<string, Array<(event: unknown) => Promise<void>>>();
	return {
		on: vi.fn((type: string, handler: (event: unknown) => Promise<void>) => {
			const list = handlers.get(type) ?? [];
			list.push(handler);
			handlers.set(type, list);
			return () => {
				const idx = list.indexOf(handler);
				if (idx >= 0) list.splice(idx, 1);
			};
		}),
		emit: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
		listenerCount: vi.fn(() => 0),
		async fire(type: string, source: string, payload: Record<string, unknown>) {
			const list = handlers.get(type) ?? [];
			for (const handler of list) {
				await handler({ type, source, payload, timestamp: Date.now() });
			}
		},
	};
}

function createMockResend() {
	return { emails: { send: vi.fn(async () => ({ id: "email-1" })) } };
}

const CONFIG = {
	fromAddress: "Test Store <orders@test.com>",
	storeName: "Test Store",
	adminEmail: "admin@test.com",
};

// ── Registration ─────────────────────────────────────────────────────

describe("registerNotificationHandlers", () => {
	it("registers handlers for all 15 event types", () => {
		const bus = createMockBus();
		const resend = createMockResend();

		registerNotificationHandlers(bus, resend, CONFIG);

		const events = bus.on.mock.calls.map((call: unknown[]) => call[0]);
		expect(events).toContain("checkout.completed");
		expect(events).toContain("order.shipped");
		expect(events).toContain("order.fulfilled");
		expect(events).toContain("order.cancelled");
		expect(events).toContain("payment.refunded");
		expect(events).toContain("shipment.delivered");
		expect(events).toContain("return.approved");
		expect(events).toContain("payment.failed");
		expect(events).toContain("inventory.low");
		expect(events).toContain("inventory.back-in-stock");
		expect(events).toContain("review.requested");
		expect(events).toContain("subscription.created");
		expect(events).toContain("subscription.renewed");
		expect(events).toContain("subscription.cancelled");
		expect(events).toContain("customer.created");
		expect(bus.on).toHaveBeenCalledTimes(15);
	});

	it("returns unsubscribe function", () => {
		const bus = createMockBus();
		const resend = createMockResend();

		const unsubs: Array<() => void> = [];
		bus.on.mockImplementation(() => {
			const unsub = vi.fn();
			unsubs.push(unsub);
			return unsub;
		});

		const unsubAll = registerNotificationHandlers(bus, resend, CONFIG);
		unsubAll();

		for (const unsub of unsubs) {
			expect(unsub).toHaveBeenCalledOnce();
		}
	});

	it("respects enabledEvents filter", () => {
		const bus = createMockBus();
		const resend = createMockResend();

		const enabled = new Set(["checkout.completed", "customer.created"]);
		registerNotificationHandlers(bus, resend, CONFIG, enabled);

		const events = bus.on.mock.calls.map((call: unknown[]) => call[0]);
		expect(events).toEqual(["checkout.completed", "customer.created"]);
		expect(bus.on).toHaveBeenCalledTimes(2);
	});

	it("uses default config when none provided", () => {
		const bus = createMockBus();
		const resend = createMockResend();

		// Should not throw
		registerNotificationHandlers(bus, resend);
		expect(bus.on).toHaveBeenCalled();
	});
});

// ── Individual event handlers ────────────────────────────────────────

describe("checkout.completed handler", () => {
	let bus: ReturnType<typeof createMockBus>;
	let resend: ReturnType<typeof createMockResend>;

	beforeEach(() => {
		bus = createMockBus();
		resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("sends order confirmation email", async () => {
		await bus.fire("checkout.completed", "checkout", {
			sessionId: "sess-1",
			orderId: "ord-1",
			orderNumber: "ORD-001",
			email: "buyer@example.com",
			customerName: "John Doe",
			items: [{ name: "Widget", quantity: 2, price: 1999 }],
			subtotal: 3998,
			taxAmount: 320,
			shippingAmount: 500,
			discountAmount: 0,
			total: 4818,
			currency: "USD",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		const call = resend.emails.send.mock.calls[0][0];
		expect(call.to).toEqual(["buyer@example.com"]);
		expect(call.subject).toBe("Order Confirmed - ORD-001");
		expect(call.from).toBe(CONFIG.fromAddress);
	});

	it("skips when no email address", async () => {
		await bus.fire("checkout.completed", "checkout", {
			sessionId: "sess-1",
			orderId: "ord-1",
			orderNumber: "ORD-001",
			email: "",
			customerName: "John Doe",
			items: [],
			subtotal: 0,
			taxAmount: 0,
			shippingAmount: 0,
			discountAmount: 0,
			total: 0,
			currency: "USD",
		});

		expect(resend.emails.send).not.toHaveBeenCalled();
	});
});

describe("order.shipped handler", () => {
	let bus: ReturnType<typeof createMockBus>;
	let resend: ReturnType<typeof createMockResend>;

	beforeEach(() => {
		bus = createMockBus();
		resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("sends shipping notification email", async () => {
		await bus.fire("order.shipped", "orders", {
			orderId: "ord-1",
			orderNumber: "ORD-001",
			email: "buyer@example.com",
			customerName: "Jane",
			trackingNumber: "1Z999AA10123456784",
			carrier: "ups",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Your Order Has Shipped - ORD-001",
		);
	});

	it("auto-generates tracking URL from carrier info", async () => {
		const { getTrackingUrl } = await import("lib/carrier-tracking");

		await bus.fire("order.shipped", "orders", {
			orderId: "ord-1",
			orderNumber: "ORD-001",
			email: "buyer@example.com",
			customerName: "Jane",
			trackingNumber: "TRACK123",
			carrier: "fedex",
		});

		expect(getTrackingUrl).toHaveBeenCalledWith("fedex", "TRACK123");
	});

	it("skips when no email", async () => {
		await bus.fire("order.shipped", "orders", {
			orderId: "ord-1",
			orderNumber: "ORD-001",
			email: "",
			customerName: "Jane",
		});

		expect(resend.emails.send).not.toHaveBeenCalled();
	});
});

describe("order.cancelled handler", () => {
	it("sends cancellation email with reason", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("order.cancelled", "orders", {
			orderId: "ord-1",
			orderNumber: "ORD-002",
			email: "buyer@example.com",
			customerName: "Alice",
			reason: "Customer requested cancellation",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Order Cancelled - ORD-002",
		);
	});
});

describe("payment.refunded handler", () => {
	it("sends refund processed email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("payment.refunded", "payments", {
			paymentIntentId: "pi_1",
			refundId: "ref_1",
			orderNumber: "ORD-003",
			email: "buyer@example.com",
			customerName: "Bob",
			refundAmount: 2999,
			currency: "USD",
			items: [{ name: "Widget", quantity: 1, price: 2999 }],
			reason: "Defective product",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Refund Processed - ORD-003",
		);
	});
});

describe("shipment.delivered handler", () => {
	it("sends delivery confirmation email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("shipment.delivered", "shipping", {
			orderId: "ord-1",
			orderNumber: "ORD-004",
			email: "buyer@example.com",
			customerName: "Carol",
			deliveredAt: "2026-03-18T15:00:00Z",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Your Order Has Been Delivered - ORD-004",
		);
	});
});

describe("payment.failed handler", () => {
	it("sends payment failed email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("payment.failed", "payments", {
			paymentIntentId: "pi_fail",
			orderNumber: "ORD-005",
			email: "buyer@example.com",
			customerName: "Dan",
			amount: 4999,
			currency: "USD",
			reason: "Card declined",
			retryUrl: "https://store.example.com/checkout/retry",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Payment Failed - ORD-005",
		);
	});

	it("omits order number from subject when not provided", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("payment.failed", "payments", {
			paymentIntentId: "pi_fail",
			email: "buyer@example.com",
			customerName: "Dan",
		});

		expect(resend.emails.send.mock.calls[0][0].subject).toBe("Payment Failed");
	});
});

describe("inventory.low handler", () => {
	it("sends low stock alert to admin", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("inventory.low", "inventory", {
			productId: "prod-1",
			quantity: 3,
			reserved: 1,
			available: 2,
			lowStockThreshold: 5,
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].to).toEqual(["admin@test.com"]);
		expect(resend.emails.send.mock.calls[0][0].subject).toContain(
			"Low Stock Alert",
		);
	});

	it("includes out of stock label when available is 0", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("inventory.low", "inventory", {
			productId: "prod-2",
			quantity: 0,
			reserved: 0,
			available: 0,
			lowStockThreshold: 5,
		});

		expect(resend.emails.send.mock.calls[0][0].subject).toContain(
			"Out of Stock",
		);
	});

	it("skips when no admin email configured", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, {
			...CONFIG,
			adminEmail: undefined,
		});

		await bus.fire("inventory.low", "inventory", {
			productId: "prod-1",
			quantity: 2,
			reserved: 0,
			available: 2,
			lowStockThreshold: 5,
		});

		expect(resend.emails.send).not.toHaveBeenCalled();
	});
});

describe("inventory.back-in-stock handler", () => {
	it("sends email to all subscribers", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("inventory.back-in-stock", "inventory", {
			productId: "prod-1",
			available: 10,
			subscribers: [
				{ email: "sub1@example.com", productName: "Blue Widget" },
				{ email: "sub2@example.com", productName: "Blue Widget" },
			],
		});

		expect(resend.emails.send).toHaveBeenCalledTimes(2);
		expect(resend.emails.send.mock.calls[0][0].to).toEqual([
			"sub1@example.com",
		]);
		expect(resend.emails.send.mock.calls[1][0].to).toEqual([
			"sub2@example.com",
		]);
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Back in Stock: Blue Widget",
		);
	});

	it("skips when no subscribers", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("inventory.back-in-stock", "inventory", {
			productId: "prod-1",
			available: 10,
			subscribers: [],
		});

		expect(resend.emails.send).not.toHaveBeenCalled();
	});
});

describe("customer.created handler", () => {
	it("sends welcome email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("customer.created", "customers", {
			customerId: "cust-1",
			email: "new@example.com",
			firstName: "Eve",
			lastName: "Smith",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Welcome to Test Store!",
		);
		expect(resend.emails.send.mock.calls[0][0].to).toEqual(["new@example.com"]);
	});
});

describe("subscription handlers", () => {
	it("sends subscription confirmed email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("subscription.created", "subscriptions", {
			subscriptionId: "sub-1",
			planId: "plan-1",
			planName: "Pro Monthly",
			email: "member@example.com",
			status: "active",
			interval: "monthly",
			price: 2999,
			currency: "USD",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Subscription Confirmed - Pro Monthly",
		);
	});

	it("sends subscription renewed email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("subscription.renewed", "subscriptions", {
			subscriptionId: "sub-1",
			planId: "plan-1",
			planName: "Pro Monthly",
			email: "member@example.com",
			currentPeriodStart: new Date("2026-03-01"),
			currentPeriodEnd: new Date("2026-04-01"),
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Subscription Renewed - Pro Monthly",
		);
	});

	it("sends subscription cancelled email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("subscription.cancelled", "subscriptions", {
			subscriptionId: "sub-1",
			planId: "plan-1",
			email: "member@example.com",
			cancelledAt: new Date("2026-03-18"),
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Subscription Cancelled",
		);
	});
});

describe("review.requested handler", () => {
	it("sends review request email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("review.requested", "reviews", {
			orderId: "ord-1",
			orderNumber: "ORD-010",
			email: "buyer@example.com",
			customerName: "Frank",
			items: [
				{
					productId: "prod-1",
					name: "Widget",
					reviewUrl: "https://store.example.com/products/widget#review",
				},
			],
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"How Was Your Order? - ORD-010",
		);
	});
});

describe("return.approved handler", () => {
	it("sends return approved email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("return.approved", "returns", {
			orderId: "ord-1",
			orderNumber: "ORD-011",
			returnId: "ret-1",
			email: "buyer@example.com",
			customerName: "Grace",
			items: ["Widget", "Gadget"],
			instructions: "Ship to: 123 Return St, NY 10001",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Return Approved - ORD-011",
		);
	});
});

describe("order.fulfilled handler", () => {
	it("sends order completed email", async () => {
		const bus = createMockBus();
		const resend = createMockResend();
		registerNotificationHandlers(bus, resend, CONFIG);

		await bus.fire("order.fulfilled", "orders", {
			orderId: "ord-1",
			orderNumber: "ORD-012",
			email: "buyer@example.com",
			customerName: "Helen",
		});

		expect(resend.emails.send).toHaveBeenCalledOnce();
		expect(resend.emails.send.mock.calls[0][0].subject).toBe(
			"Your Order is Complete - ORD-012",
		);
	});
});
