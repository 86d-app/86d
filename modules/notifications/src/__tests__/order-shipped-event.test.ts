import { createEventBus, createScopedEmitter } from "@86d-app/core";
import {
	createMockDataService,
	createMockModuleContext,
} from "@86d-app/core/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import notifications from "../index";

const shippedPayload = {
	orderId: "order-ship-001",
	orderNumber: "ORD-SHIP001",
	email: "customer@example.com",
	customerName: "Alice",
	carrier: "UPS",
	trackingNumber: "1Z999AA10123456784",
	trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
};

async function initModule(
	mod: ReturnType<typeof notifications>,
	data: ReturnType<typeof createMockDataService>,
	events?: ReturnType<typeof createScopedEmitter>,
) {
	const init = mod.init;
	expect(init).toBeDefined();
	if (init) {
		const ctx = createMockModuleContext({ data });
		await init({ ...ctx, events });
	}
}

describe("order.shipped event listener", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends shipping email with tracking details via Resend", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ship-001" }), {
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

		await orderEmitter.emit("order.shipped", shippedPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.to).toBe("customer@example.com");
		expect(body.subject).toBe("Order ORD-SHIP001 has shipped");
		expect(body.html).toContain("Order Shipped");
		expect(body.html).toContain("UPS");
		expect(body.html).toContain("1Z999AA10123456784");
		expect(body.html).toContain("Track Your Order");

		fetchSpy.mockRestore();
	});

	it("includes correct tags in email", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ship-002" }), {
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

		await orderEmitter.emit("order.shipped", shippedPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.tags).toEqual(
			expect.arrayContaining([
				{ name: "type", value: "order_shipped" },
				{ name: "order_id", value: "order-ship-001" },
			]),
		);

		fetchSpy.mockRestore();
	});

	it("sends email without tracking details when not provided", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ship-003" }), {
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

		await orderEmitter.emit("order.shipped", {
			orderId: "order-ship-002",
			orderNumber: "ORD-SHIP002",
			email: "buyer@example.com",
			customerName: "Bob",
		});
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.to).toBe("buyer@example.com");
		expect(body.html).toContain("Order Shipped");
		expect(body.html).not.toContain("Track Your Order");

		fetchSpy.mockRestore();
	});

	it("does not send email when provider is not configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("order.shipped", shippedPayload);
		await new Promise((r) => setTimeout(r, 50));

		const resendCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(resendCall).toBeUndefined();

		fetchSpy.mockRestore();
	});

	it("does not send email when email is empty", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch");

		await initModule(
			notifications({
				resendApiKey: "re_test_key",
				resendFromAddress: "Store <noreply@store.com>",
			}),
			mockData,
			emitter,
		);

		await orderEmitter.emit("order.shipped", {
			...shippedPayload,
			email: "",
		});
		await new Promise((r) => setTimeout(r, 50));

		const resendCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(resendCall).toBeUndefined();

		fetchSpy.mockRestore();
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

		// Should not throw
		await orderEmitter.emit("order.shipped", shippedPayload);
		await new Promise((r) => setTimeout(r, 50));

		fetchSpy.mockRestore();
	});

	it("registers order.shipped handler via init", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");

		await initModule(notifications(), mockData, emitter);

		expect(bus.listenerCount("order.shipped")).toBe(1);
	});
});
