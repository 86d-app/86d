import { createEventBus, createScopedEmitter } from "@86d-app/core";
import {
	createMockDataService,
	createMockModuleContext,
} from "@86d-app/core/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import notifications from "../index";

const returnPayload = {
	returnId: "ret-001",
	orderId: "order-001",
	orderNumber: "ORD-RET001",
	email: "customer@example.com",
	customerName: "Alice",
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

describe("return lifecycle event listeners", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("registers handlers for all four return events", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");

		await initModule(notifications(), mockData, emitter);

		expect(bus.listenerCount("return.requested")).toBe(1);
		expect(bus.listenerCount("return.approved")).toBe(1);
		expect(bus.listenerCount("return.rejected")).toBe(1);
		expect(bus.listenerCount("return.completed")).toBe(1);
	});

	it("sends email on return.requested", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ret-001" }), {
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

		await orderEmitter.emit("return.requested", {
			...returnPayload,
			reason: "Defective item",
		});
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		expect(fetchCall).toBeDefined();

		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.to).toBe("customer@example.com");
		expect(body.subject).toContain("ORD-RET001");
		expect(body.subject).toContain("received");
		expect(body.html).toContain("Return Request Received");
		expect(body.html).toContain("Defective item");

		fetchSpy.mockRestore();
	});

	it("sends email on return.approved", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ret-002" }), {
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

		await orderEmitter.emit("return.approved", returnPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.subject).toContain("approved");
		expect(body.html).toContain("Return Request Approved");
		expect(body.tags).toEqual(
			expect.arrayContaining([
				{ name: "type", value: "return_approved" },
				{ name: "return_id", value: "ret-001" },
			]),
		);

		fetchSpy.mockRestore();
	});

	it("sends email on return.rejected with admin notes", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ret-003" }), {
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

		await orderEmitter.emit("return.rejected", {
			...returnPayload,
			adminNotes: "Item was used beyond return window",
		});
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.html).toContain("Return Request Update");
		expect(body.html).toContain("Item was used beyond return window");
		expect(body.tags).toEqual(
			expect.arrayContaining([{ name: "type", value: "return_rejected" }]),
		);

		fetchSpy.mockRestore();
	});

	it("sends email on return.completed", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ id: "msg-ret-004" }), {
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

		await orderEmitter.emit("return.completed", returnPayload);
		await new Promise((r) => setTimeout(r, 50));

		const fetchCall = fetchSpy.mock.calls.find(
			(c) => typeof c[0] === "string" && c[0].includes("resend.com/emails"),
		);
		const body = JSON.parse(
			(fetchCall?.[1] as RequestInit | undefined)?.body as string,
		);
		expect(body.subject).toContain("completed");
		expect(body.html).toContain("Return Completed");
		expect(body.tags).toEqual(
			expect.arrayContaining([{ name: "type", value: "return_completed" }]),
		);

		fetchSpy.mockRestore();
	});

	it("does not send email when provider is not configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "notifications");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const fetchSpy = vi.spyOn(globalThis, "fetch");

		await initModule(notifications(), mockData, emitter);

		await orderEmitter.emit("return.requested", returnPayload);
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

		await orderEmitter.emit("return.approved", {
			...returnPayload,
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
		await orderEmitter.emit("return.approved", returnPayload);
		await new Promise((r) => setTimeout(r, 50));

		fetchSpy.mockRestore();
	});
});
