import { createEventBus, createScopedEmitter } from "@86d-app/core";
import {
	createMockDataService,
	createMockModuleContext,
} from "@86d-app/core/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import notifications from "../index";

const checkoutPayload = {
	sessionId: "sess-001",
	orderId: "order-001",
	orderNumber: "ORD-XYZ",
	customerId: "cust-001",
	email: "buyer@example.com",
	customerName: "Alice",
	items: [
		{ name: "T-Shirt", quantity: 2, price: 2500 },
		{ name: "Hat", quantity: 1, price: 1500 },
	],
	subtotal: 6500,
	taxAmount: 520,
	shippingAmount: 500,
	discountAmount: 0,
	giftCardAmount: 0,
	total: 7520,
	currency: "usd",
	shippingAddress: {
		firstName: "Alice",
		lastName: "Smith",
		line1: "100 Commerce St",
		city: "Austin",
		state: "TX",
		postalCode: "78701",
		country: "US",
	},
};

async function initModule(
	mod: ReturnType<typeof notifications>,
	data: ReturnType<typeof createMockDataService>,
	events?: ReturnType<typeof createScopedEmitter>,
	controllers?: Record<string, Record<string, (...args: never) => unknown>>,
) {
	const init = mod.init;
	expect(init).toBeDefined();
	if (init) {
		const ctx = createMockModuleContext({ data });
		if (controllers) {
			Object.assign(ctx.controllers, controllers);
		}
		await init({ ...ctx, events });
	}
}

describe("checkout.completed event listener", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates in-app notification for logged-in customer", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		await initModule(notifications(), mockData, emitter);

		await checkoutEmitter.emit("checkout.completed", checkoutPayload);
		await new Promise((r) => setTimeout(r, 50));

		const allNotifications = mockData.all("notification");
		const orderNotif = allNotifications.find(
			(n) => n.type === "order" && n.customerId === "cust-001",
		);
		expect(orderNotif).toBeDefined();
		expect(orderNotif?.title).toBe("Order ORD-XYZ confirmed");
		expect(orderNotif?.actionUrl).toBe("/orders/order-001");
	});

	it("sends confirmation email via Resend when provider is configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-001" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		await initModule(
			notifications({
				resendApiKey: "re_test_key",
				resendFromAddress: "Store <noreply@store.com>",
			}),
			mockData,
			emitter,
		);

		await checkoutEmitter.emit("checkout.completed", checkoutPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.to).toBe("buyer@example.com");
		expect(body.subject).toBe("Order ORD-XYZ confirmed");
		expect(body.html).toContain("Order Confirmed");
		expect(body.html).toContain("T-Shirt");
		expect(body.html).toContain("Hat");

		fetchSpy.mockRestore();
	});

	it("skips in-app notification for guest checkout (no customerId)", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-002" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		await initModule(
			notifications({
				resendApiKey: "re_test_key",
				resendFromAddress: "Store <noreply@store.com>",
			}),
			mockData,
			emitter,
		);

		const guestPayload = { ...checkoutPayload, customerId: undefined };
		await checkoutEmitter.emit("checkout.completed", guestPayload);
		await new Promise((r) => setTimeout(r, 50));

		const orderNotifs = mockData
			.all("notification")
			.filter((n) => n.type === "order");
		expect(orderNotifs).toHaveLength(0);

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		fetchSpy.mockRestore();
	});

	it("does not send email when provider is not configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		const fetchSpy = vi.spyOn(globalThis, "fetch");

		await initModule(notifications(), mockData, emitter);

		await checkoutEmitter.emit("checkout.completed", checkoutPayload);
		await new Promise((r) => setTimeout(r, 50));

		const orderNotifs = mockData
			.all("notification")
			.filter((n) => n.type === "order");
		expect(orderNotifs).toHaveLength(1);

		const resendCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(resendCall).toBeUndefined();

		fetchSpy.mockRestore();
	});

	it("handles email delivery failure gracefully", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValue(new Error("Network error"));

		await initModule(
			notifications({
				resendApiKey: "re_test_key",
				resendFromAddress: "Store <noreply@store.com>",
			}),
			mockData,
			emitter,
		);

		await checkoutEmitter.emit("checkout.completed", checkoutPayload);
		await new Promise((r) => setTimeout(r, 50));

		const orderNotifs = mockData
			.all("notification")
			.filter((n) => n.type === "order");
		expect(orderNotifs).toHaveLength(1);

		fetchSpy.mockRestore();
	});

	it("does nothing when events is undefined", async () => {
		await initModule(
			notifications({
				resendApiKey: "re_test_key",
				resendFromAddress: "Store <noreply@store.com>",
			}),
			mockData,
			undefined,
		);
	});

	it("registers checkout.completed handler via init", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");

		await initModule(notifications(), mockData, emitter);

		expect(bus.listenerCount("checkout.completed")).toBe(1);
	});
});

describe("customerResolver wiring from ctx.controllers.customers", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("resolves customer email from customers controller for in-app notification delivery", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-100" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const mockCustomersController = {
			getById: vi.fn().mockResolvedValue({
				id: "cust-001",
				email: "alice@example.com",
				phone: "+15551234567",
				firstName: "Alice",
				lastName: "Smith",
			}),
		};

		const mod = notifications({
			resendApiKey: "re_test_key",
			resendFromAddress: "Store <noreply@store.com>",
			twilioAccountSid: "AC_test",
			twilioAuthToken: "test_token",
			twilioFromNumber: "+15559999999",
		});

		await initModule(mod, mockData, emitter, {
			customer: mockCustomersController,
		});

		// The controller returned from init should have a working customerResolver.
		// Trigger checkout.completed — the in-app notification created by controller.create()
		// with channel "both" will trigger deliverExternal(), which uses customerResolver.
		await checkoutEmitter.emit("checkout.completed", checkoutPayload);
		await new Promise((r) => setTimeout(r, 100));

		// The customers controller getById should have been called to resolve contact info
		expect(mockCustomersController.getById).toHaveBeenCalledWith("cust-001");

		// Verify that the Resend email was sent to the customer's email
		// (separate from the direct email sent via the checkout event handler)
		const resendCalls = fetchSpy.mock.calls.filter(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		// At least 2 calls: one direct from checkout handler, one from deliverExternal
		expect(resendCalls.length).toBeGreaterThanOrEqual(2);

		// Verify a Twilio SMS call was made
		const twilioCalls = fetchSpy.mock.calls.filter(
			(c) => typeof c[0] === "string" && c[0].includes("api.twilio.com"),
		);
		expect(twilioCalls.length).toBeGreaterThanOrEqual(1);

		fetchSpy.mockRestore();
	});

	it("degrades gracefully when customers controller is not available", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const checkoutEmitter = createScopedEmitter(bus, "checkout");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-101" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const mod = notifications({
			resendApiKey: "re_test_key",
			resendFromAddress: "Store <noreply@store.com>",
		});

		// No customers controller passed
		await initModule(mod, mockData, emitter, {});

		await checkoutEmitter.emit("checkout.completed", checkoutPayload);
		await new Promise((r) => setTimeout(r, 50));

		// In-app notification still created
		const allNotifs = mockData.all("notification");
		expect(allNotifs.length).toBeGreaterThanOrEqual(1);

		// Direct email still sent (from checkout handler, not deliverExternal)
		const resendCalls = fetchSpy.mock.calls.filter(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(resendCalls.length).toBe(1); // only the direct email, not from deliverExternal

		fetchSpy.mockRestore();
	});
});
