import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createDoordashController } from "../service-impl";
import { createDoordashWebhook } from "../store/endpoints/webhook";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Invoke the webhook endpoint handler. Handles better-call endpoint shape. */
async function callWebhook(
	handler: ReturnType<typeof createDoordashWebhook>,
	request: Request,
	// biome-ignore lint/suspicious/noExplicitAny: optional mock context
	context?: any,
): Promise<Response> {
	// biome-ignore lint/suspicious/noExplicitAny: test helper accesses internal handler
	const h = handler as any;
	const fn = typeof h.handler === "function" ? h.handler : h;
	return fn({ request, context }) as Promise<Response>;
}

function createMockEvents() {
	const emitted: Array<{ type: string; payload: unknown }> = [];
	return {
		emitted,
		emit: vi.fn(async (type: string, payload: unknown) => {
			emitted.push({ type, payload });
		}),
		on: vi.fn(() => () => {}),
		off: vi.fn(),
	};
}

function makeWebhookRequest(body: Record<string, unknown>): Request {
	return new Request("https://store.example.com/api/doordash/webhook", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function createTestContext() {
	const data = createMockDataService();
	const events = createMockEvents();
	const controller = createDoordashController(data, events);
	return {
		data,
		events,
		controller,
		context: { controllers: { doordash: controller }, events },
	};
}

// ── Realistic webhook payloads ───────────────────────────────────────────────

const DASHER_CONFIRMED_PAYLOAD = {
	external_delivery_id: "86d_delivery-1",
	event_name: "DASHER_CONFIRMED",
	dasher_id: 98765,
	dasher_name: "Maria G.",
	pickup_address: "901 Market St, San Francisco, CA 94103",
	dropoff_address: "123 Main St, San Francisco, CA 94105",
	order_value: 3500,
	currency: "USD",
	fee: 899,
	tip: 200,
	created_at: "2026-03-17T18:05:00Z",
	support_reference: "SR-12345678",
};

const DASHER_PICKED_UP_PAYLOAD = {
	external_delivery_id: "86d_delivery-1",
	event_name: "DASHER_PICKED_UP",
	dasher_id: 98765,
	dasher_name: "Maria G.",
	pickup_time_actual: "2026-03-17T18:32:00Z",
	created_at: "2026-03-17T18:32:00Z",
	support_reference: "SR-12345678",
};

const DASHER_DROPPED_OFF_PAYLOAD = {
	external_delivery_id: "86d_delivery-1",
	event_name: "DASHER_DROPPED_OFF",
	dasher_id: 98765,
	dasher_name: "Maria G.",
	dropoff_time_actual: "2026-03-17T19:01:00Z",
	created_at: "2026-03-17T19:01:00Z",
	support_reference: "SR-12345678",
};

const DELIVERY_CANCELLED_PAYLOAD = {
	external_delivery_id: "86d_delivery-1",
	event_name: "DELIVERY_CANCELLED",
	created_at: "2026-03-17T18:10:00Z",
	support_reference: "SR-12345678",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("doordash webhook endpoint", () => {
	const endpoint = createDoordashWebhook();

	it("rejects invalid JSON with 400", async () => {
		const request = new Request(
			"https://store.example.com/api/doordash/webhook",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not json",
			},
		);

		const { context } = createTestContext();
		const response = await callWebhook(endpoint, request, context);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe("Invalid JSON body.");
	});

	it("rejects payloads missing external_delivery_id", async () => {
		const request = makeWebhookRequest({ event_name: "DASHER_CONFIRMED" });
		const { context } = createTestContext();
		const response = await callWebhook(endpoint, request, context);

		expect(response.status).toBe(400);
	});

	it("rejects payloads missing event_name", async () => {
		const request = makeWebhookRequest({
			external_delivery_id: "86d_delivery-1",
		});
		const { context } = createTestContext();
		const response = await callWebhook(endpoint, request, context);

		expect(response.status).toBe(400);
	});

	it("emits doordash.webhook.received event for all webhooks", async () => {
		const request = makeWebhookRequest(DASHER_CONFIRMED_PAYLOAD);
		const { context, events } = createTestContext();

		await callWebhook(endpoint, request, context);

		expect(events.emitted).toContainEqual({
			type: "doordash.webhook.received",
			payload: {
				eventName: "DASHER_CONFIRMED",
				externalDeliveryId: "86d_delivery-1",
			},
		});
	});

	it("returns handled:false when delivery not found", async () => {
		const request = makeWebhookRequest(DASHER_CONFIRMED_PAYLOAD);
		const { context } = createTestContext();

		const response = await callWebhook(endpoint, request, context);

		const body = await response.json();
		expect(body.received).toBe(true);
		expect(body.handled).toBe(false);
		expect(body.reason).toBe("delivery_not_found");
	});

	it("updates delivery status on DASHER_CONFIRMED", async () => {
		const { data, controller, context } = createTestContext();

		// Create a delivery with matching external ID
		const delivery = await controller.createDelivery({
			orderId: "order-1",
			pickupAddress: { street: "901 Market St" },
			dropoffAddress: { street: "123 Main St" },
			fee: 899,
		});
		const stored = await data.get("delivery", delivery.id);
		await data.upsert("delivery", delivery.id, {
			...(stored as Record<string, unknown>),
			externalDeliveryId: "86d_delivery-1",
		});

		const request = makeWebhookRequest(DASHER_CONFIRMED_PAYLOAD);
		const response = await callWebhook(endpoint, request, context);

		const body = await response.json();
		expect(body.received).toBe(true);
		expect(body.handled).toBe(true);
		expect(body.deliveryId).toBe(delivery.id);

		const updated = await controller.getDelivery(delivery.id);
		expect(updated?.status).toBe("accepted");
	});

	it("updates delivery status on DASHER_PICKED_UP", async () => {
		const { data, controller, context } = createTestContext();

		const delivery = await controller.createDelivery({
			orderId: "order-2",
			pickupAddress: { street: "901 Market St" },
			dropoffAddress: { street: "123 Main St" },
			fee: 899,
		});
		const stored = await data.get("delivery", delivery.id);
		await data.upsert("delivery", delivery.id, {
			...(stored as Record<string, unknown>),
			externalDeliveryId: "86d_delivery-1",
		});
		await controller.updateDeliveryStatus(delivery.id, "accepted");

		const request = makeWebhookRequest(DASHER_PICKED_UP_PAYLOAD);
		await callWebhook(endpoint, request, context);

		const updated = await controller.getDelivery(delivery.id);
		expect(updated?.status).toBe("picked-up");
	});

	it("updates delivery status on DASHER_DROPPED_OFF", async () => {
		const { data, controller, context } = createTestContext();

		const delivery = await controller.createDelivery({
			orderId: "order-3",
			pickupAddress: { street: "901 Market St" },
			dropoffAddress: { street: "123 Main St" },
			fee: 899,
		});
		const stored = await data.get("delivery", delivery.id);
		await data.upsert("delivery", delivery.id, {
			...(stored as Record<string, unknown>),
			externalDeliveryId: "86d_delivery-1",
		});
		await controller.updateDeliveryStatus(delivery.id, "accepted");
		await controller.updateDeliveryStatus(delivery.id, "picked-up");

		const request = makeWebhookRequest(DASHER_DROPPED_OFF_PAYLOAD);
		await callWebhook(endpoint, request, context);

		const updated = await controller.getDelivery(delivery.id);
		expect(updated?.status).toBe("delivered");
	});

	it("cancels delivery on DELIVERY_CANCELLED", async () => {
		const { data, controller, context } = createTestContext();

		const delivery = await controller.createDelivery({
			orderId: "order-4",
			pickupAddress: { street: "901 Market St" },
			dropoffAddress: { street: "123 Main St" },
			fee: 899,
		});
		const stored = await data.get("delivery", delivery.id);
		await data.upsert("delivery", delivery.id, {
			...(stored as Record<string, unknown>),
			externalDeliveryId: "86d_delivery-1",
		});

		const request = makeWebhookRequest(DELIVERY_CANCELLED_PAYLOAD);
		await callWebhook(endpoint, request, context);

		const updated = await controller.getDelivery(delivery.id);
		expect(updated?.status).toBe("cancelled");
	});

	it("returns handled:false for unknown event types", async () => {
		const request = makeWebhookRequest({
			external_delivery_id: "86d_delivery-1",
			event_name: "DELIVERY_BATCHED",
		});
		const { context } = createTestContext();

		const response = await callWebhook(endpoint, request, context);

		const body = await response.json();
		expect(body.received).toBe(true);
		expect(body.handled).toBe(false);
	});
});

// ── Signature verification tests ────────────────────────────────────────────

const TEST_SIGNING_SECRET = "dGVzdC1zaWduaW5nLXNlY3JldC1mb3ItdW5pdC10ZXN0cw==";

async function computeSignature(
	payload: string,
	secret: string,
): Promise<string> {
	const binary = atob(secret);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	const key = await crypto.subtle.importKey(
		"raw",
		bytes.buffer as ArrayBuffer,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function makeSignedRequest(body: string, signature: string | null): Request {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (signature !== null) {
		headers["x-doordash-signature"] = signature;
	}
	return new Request("https://store.example.com/api/doordash/webhook", {
		method: "POST",
		headers,
		body,
	});
}

describe("doordash webhook signature verification", () => {
	const signedEndpoint = createDoordashWebhook(TEST_SIGNING_SECRET);

	it("accepts a valid signature", async () => {
		const body = JSON.stringify(DASHER_CONFIRMED_PAYLOAD);
		const signature = await computeSignature(body, TEST_SIGNING_SECRET);
		const request = makeSignedRequest(body, signature);
		const { context } = createTestContext();

		const response = await callWebhook(signedEndpoint, request, context);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.received).toBe(true);
	});

	it("rejects missing signature with 401", async () => {
		const body = JSON.stringify(DASHER_CONFIRMED_PAYLOAD);
		const request = makeSignedRequest(body, null);
		const { context } = createTestContext();

		const response = await callWebhook(signedEndpoint, request, context);

		expect(response.status).toBe(401);
		const json = await response.json();
		expect(json.error).toBe("Missing webhook signature.");
	});

	it("rejects empty signature with 401", async () => {
		const body = JSON.stringify(DASHER_CONFIRMED_PAYLOAD);
		const request = makeSignedRequest(body, "");
		const { context } = createTestContext();

		const response = await callWebhook(signedEndpoint, request, context);

		expect(response.status).toBe(401);
		const json = await response.json();
		expect(json.error).toBe("Missing webhook signature.");
	});

	it("rejects invalid signature with 401", async () => {
		const body = JSON.stringify(DASHER_CONFIRMED_PAYLOAD);
		const request = makeSignedRequest(
			body,
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		const { context } = createTestContext();

		const response = await callWebhook(signedEndpoint, request, context);

		expect(response.status).toBe(401);
		const json = await response.json();
		expect(json.error).toBe("Invalid webhook signature.");
	});

	it("rejects tampered body with 401", async () => {
		const originalBody = JSON.stringify(DASHER_CONFIRMED_PAYLOAD);
		const signature = await computeSignature(originalBody, TEST_SIGNING_SECRET);
		const tamperedBody = JSON.stringify({
			...DASHER_CONFIRMED_PAYLOAD,
			event_name: "DELIVERY_CANCELLED",
		});
		const request = makeSignedRequest(tamperedBody, signature);
		const { context } = createTestContext();

		const response = await callWebhook(signedEndpoint, request, context);

		expect(response.status).toBe(401);
	});

	it("skips verification when no signing secret configured", async () => {
		const unsignedEndpoint = createDoordashWebhook();
		const body = JSON.stringify(DASHER_CONFIRMED_PAYLOAD);
		// No signature header at all
		const request = makeSignedRequest(body, null);
		const { context } = createTestContext();

		const response = await callWebhook(unsignedEndpoint, request, context);

		// Should process normally without signature check
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.received).toBe(true);
	});
});
