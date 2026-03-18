import { createEventBus, createScopedEmitter } from "@86d-app/core";
import {
	createMockDataService,
	createMockModuleContext,
} from "@86d-app/core/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import notifications from "../index";

const fulfilledPayload = {
	orderId: "order-100",
	orderNumber: "ORD-FULFILLED",
	customerId: "cust-100",
	email: "customer@example.com",
	customerName: "Bob",
};

const cancelledPayload = {
	orderId: "order-200",
	orderNumber: "ORD-CANCELLED",
	customerId: "cust-200",
	email: "buyer@example.com",
	customerName: "Carol",
	reason: "Out of stock",
};

async function initModule(
	mod: ReturnType<typeof notifications>,
	data: ReturnType<typeof createMockDataService>,
	events?: ReturnType<typeof createScopedEmitter>,
) {
	const init = mod.init;
	expect(init).toBeDefined();
	if (init) {
		await init({ ...createMockModuleContext({ data }), events });
	}
}

describe("order.fulfilled event listener", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates in-app notification for fulfilled order", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.fulfilled", fulfilledPayload);
		await new Promise((r) => setTimeout(r, 50));

		const allNotifications = mockData.all("notification");
		const fulfilledNotif = allNotifications.find(
			(n) => n.type === "order" && n.customerId === "cust-100",
		);
		expect(fulfilledNotif).toBeDefined();
		expect(fulfilledNotif?.title).toBe("Order ORD-FULFILLED fulfilled");
		expect(fulfilledNotif?.body).toContain("fulfilled and is on its way");
		expect(fulfilledNotif?.actionUrl).toBe("/orders/order-100");
	});

	it("sends fulfilled email via Resend when provider is configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-100" }), {
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

		await orderEmitter.emit("order.fulfilled", fulfilledPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.to).toBe("customer@example.com");
		expect(body.subject).toBe("Order ORD-FULFILLED has been fulfilled");
		expect(body.html).toContain("Order Fulfilled");

		fetchSpy.mockRestore();
	});

	it("skips in-app notification for guest orders (no customerId)", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.fulfilled", {
			...fulfilledPayload,
			customerId: undefined,
		});
		await new Promise((r) => setTimeout(r, 50));

		const orderNotifs = mockData
			.all("notification")
			.filter((n) => n.type === "order");
		expect(orderNotifs).toHaveLength(0);
	});

	it("does not send email when provider is not configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.fulfilled", fulfilledPayload);
		await new Promise((r) => setTimeout(r, 50));

		const resendCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(resendCall).toBeUndefined();

		fetchSpy.mockRestore();
	});

	it("registers order.fulfilled handler via init", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");

		await initModule(notifications(), mockData, emitter);

		expect(bus.listenerCount("order.fulfilled")).toBe(1);
	});
});

describe("order.cancelled event listener", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates high-priority in-app notification for cancelled order", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.cancelled", cancelledPayload);
		await new Promise((r) => setTimeout(r, 50));

		const allNotifications = mockData.all("notification");
		const cancelNotif = allNotifications.find(
			(n) => n.type === "order" && n.customerId === "cust-200",
		);
		expect(cancelNotif).toBeDefined();
		expect(cancelNotif?.title).toBe("Order ORD-CANCELLED cancelled");
		expect(cancelNotif?.body).toContain("cancelled");
		expect(cancelNotif?.body).toContain("Out of stock");
		expect(cancelNotif?.priority).toBe("high");
		expect(cancelNotif?.actionUrl).toBe("/orders/order-200");
	});

	it("sends cancelled email via Resend when provider is configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-200" }), {
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

		await orderEmitter.emit("order.cancelled", cancelledPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.to).toBe("buyer@example.com");
		expect(body.subject).toBe("Order ORD-CANCELLED has been cancelled");
		expect(body.html).toContain("Order Cancelled");
		expect(body.html).toContain("Out of stock");

		fetchSpy.mockRestore();
	});

	it("includes generic message when no reason provided", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.cancelled", {
			...cancelledPayload,
			reason: undefined,
		});
		await new Promise((r) => setTimeout(r, 50));

		const cancelNotif = mockData
			.all("notification")
			.find((n) => n.type === "order");
		expect(cancelNotif?.body).toContain("refund will be processed");
	});

	it("skips in-app notification for guest orders", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.cancelled", {
			...cancelledPayload,
			customerId: undefined,
		});
		await new Promise((r) => setTimeout(r, 50));

		const orderNotifs = mockData
			.all("notification")
			.filter((n) => n.type === "order");
		expect(orderNotifs).toHaveLength(0);
	});

	it("handles email delivery failure gracefully", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

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

		await orderEmitter.emit("order.cancelled", cancelledPayload);
		await new Promise((r) => setTimeout(r, 50));

		// In-app notification should still be created despite email failure
		const orderNotifs = mockData
			.all("notification")
			.filter((n) => n.type === "order");
		expect(orderNotifs).toHaveLength(1);

		fetchSpy.mockRestore();
	});

	it("registers order.cancelled handler via init", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");

		await initModule(notifications(), mockData, emitter);

		expect(bus.listenerCount("order.cancelled")).toBe(1);
	});
});
