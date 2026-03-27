import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import { verifyWebhookSignature } from "../provider";
import { createAmazonController } from "../service-impl";
import { createAmazonWebhook } from "../store/endpoints/webhooks";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEST_WEBHOOK_SECRET = "test-amazon-webhook-secret";

/** Compute HMAC-SHA256 hex digest using Web Crypto API. */
async function computeHmacHex(
	payload: string,
	secret: string,
): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function createMockEvents() {
	return {
		emit: vi.fn(async () => {}),
		on: vi.fn(() => () => {}),
		off: vi.fn(),
	};
}

function createTestContext() {
	const data = createMockDataService();
	const events = createMockEvents();
	const controller = createAmazonController(data, events);
	return {
		context: { controllers: { amazon: controller }, events },
	};
}

/** Invoke the webhook endpoint handler. Handles better-call endpoint shape. */
async function callWebhook(
	handler: ReturnType<typeof createAmazonWebhook>,
	request: Request,
	context?: Record<string, unknown>,
): Promise<Response> {
	const h = handler as unknown as Record<string, unknown>;
	const fn = typeof h.handler === "function" ? h.handler : h;
	return (fn as CallableFunction)({ request, context }) as Promise<Response>;
}

// ── Realistic webhook payload ────────────────────────────────────────────────

const ORDER_PAYLOAD = {
	type: "order.created",
	payload: {
		amazonOrderId: "AMZ-12345",
		status: "pending",
		fulfillmentChannel: "FBM",
		items: [],
		orderTotal: 100,
		shippingTotal: 10,
		marketplaceFee: 5,
		netProceeds: 85,
		shippingAddress: { city: "Seattle" },
	},
};

// ── Signature verification function tests ────────────────────────────────────

describe("verifyWebhookSignature", () => {
	it("returns true for valid signature", async () => {
		const body = JSON.stringify(ORDER_PAYLOAD);
		const signature = await computeHmacHex(body, TEST_WEBHOOK_SECRET);
		const result = await verifyWebhookSignature(
			body,
			signature,
			TEST_WEBHOOK_SECRET,
		);
		expect(result).toBe(true);
	});

	it("returns false for tampered payload", async () => {
		const body = JSON.stringify(ORDER_PAYLOAD);
		const signature = await computeHmacHex(body, TEST_WEBHOOK_SECRET);
		const result = await verifyWebhookSignature(
			'{"type":"order.cancelled","payload":{}}',
			signature,
			TEST_WEBHOOK_SECRET,
		);
		expect(result).toBe(false);
	});

	it("returns false for wrong signature", async () => {
		const body = JSON.stringify(ORDER_PAYLOAD);
		const result = await verifyWebhookSignature(
			body,
			"0000000000000000000000000000000000000000000000000000000000000000",
			TEST_WEBHOOK_SECRET,
		);
		expect(result).toBe(false);
	});

	it("returns false for empty signature", async () => {
		const body = JSON.stringify(ORDER_PAYLOAD);
		const result = await verifyWebhookSignature(body, "", TEST_WEBHOOK_SECRET);
		expect(result).toBe(false);
	});
});

// ── Webhook endpoint tests ───────────────────────────────────────────────────

describe("amazon webhook endpoint", () => {
	describe("without signature verification", () => {
		const endpoint = createAmazonWebhook();

		it("rejects invalid JSON with 400", async () => {
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: "not json",
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(endpoint, request, context);

			expect(response.status).toBe(400);
			const json = await response.json();
			expect(json.error).toBe("Invalid JSON body.");
		});

		it("handles order.created events", async () => {
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(ORDER_PAYLOAD),
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(endpoint, request, context);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.received).toBe(true);
			expect(json.orderId).toBeDefined();
		});

		it("returns received:true for unknown event types", async () => {
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "inventory.updated",
						payload: {},
					}),
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(endpoint, request, context);

			const json = await response.json();
			expect(json.received).toBe(true);
		});
	});

	describe("with signature verification", () => {
		const signedEndpoint = createAmazonWebhook(TEST_WEBHOOK_SECRET);

		it("accepts a valid signature", async () => {
			const body = JSON.stringify(ORDER_PAYLOAD);
			const signature = await computeHmacHex(body, TEST_WEBHOOK_SECRET);
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-amz-signature": signature,
					},
					body,
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(signedEndpoint, request, context);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.received).toBe(true);
		});

		it("rejects missing signature with 401", async () => {
			const body = JSON.stringify(ORDER_PAYLOAD);
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(signedEndpoint, request, context);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json.error).toBe("Invalid webhook signature.");
		});

		it("rejects invalid signature with 401", async () => {
			const body = JSON.stringify(ORDER_PAYLOAD);
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-amz-signature":
							"0000000000000000000000000000000000000000000000000000000000000000",
					},
					body,
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(signedEndpoint, request, context);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json.error).toBe("Invalid webhook signature.");
		});

		it("rejects tampered body with 401", async () => {
			const originalBody = JSON.stringify(ORDER_PAYLOAD);
			const signature = await computeHmacHex(originalBody, TEST_WEBHOOK_SECRET);
			const tamperedBody = JSON.stringify({
				type: "order.cancelled",
				payload: { orderId: "evil-order" },
			});
			const request = new Request(
				"https://store.example.com/api/amazon/webhooks",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-amz-signature": signature,
					},
					body: tamperedBody,
				},
			);
			const { context } = createTestContext();
			const response = await callWebhook(signedEndpoint, request, context);

			expect(response.status).toBe(401);
		});
	});
});
