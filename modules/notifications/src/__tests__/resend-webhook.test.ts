import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { DeliveryStatus, Notification } from "../service";
import { createNotificationsController } from "../service-impl";
import { createResendWebhook } from "../store/endpoints/resend-webhook";

const WEBHOOK_SECRET = "whsec_testwebhooksecret123456789";

async function signSvix(
	id: string,
	timestamp: string,
	body: string,
	secret: string,
): Promise<string> {
	const toSign = `${id}.${timestamp}.${body}`;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(toSign),
	);
	const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
	return `v1,${b64}`;
}

function makeRequest(
	body: string,
	headers: Record<string, string> = {},
): Request {
	return new Request("https://store.example.com/notifications/webhook/resend", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body,
	});
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: "notif-001",
		customerId: "cust-001",
		type: "info",
		channel: "email",
		priority: "normal",
		title: "Test",
		body: "Test body",
		metadata: {},
		read: false,
		createdAt: new Date(),
		deliveryExternalId: "email-abc123",
		deliveryStatus: "sent",
		...overrides,
	};
}

function invokeEndpoint(
	endpoint: unknown,
	ctx: Record<string, unknown>,
): Promise<Response> {
	const h = endpoint as Record<string, unknown>;
	const fn = (
		typeof h.handler === "function" ? h.handler : h
	) as CallableFunction;
	return fn(ctx) as Promise<Response>;
}

function makeCtx(
	body: string,
	headers: Record<string, string> = {},
	controllerOverrides?: Partial<
		ReturnType<typeof createNotificationsController>
	>,
) {
	const data = createMockDataService();
	const controller = createNotificationsController(data);
	if (controllerOverrides) {
		Object.assign(controller, controllerOverrides);
	}
	return {
		query: {},
		params: {},
		body: {},
		request: makeRequest(body, headers),
		context: { controllers: { notifications: controller } },
	};
}

describe("createResendWebhook", () => {
	describe("without webhook secret (dev mode)", () => {
		const webhook = createResendWebhook({});

		it("accepts email.delivered and updates delivery status", async () => {
			const notification = makeNotification({
				deliveryExternalId: "email-abc",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue({
				...notification,
				deliveryStatus: "delivered",
			});

			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-abc" },
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.handled).toBe(true);
			expect(json.deliveryStatus).toBe("delivered");
			expect(findSpy).toHaveBeenCalledWith("email-abc");
			expect(updateSpy).toHaveBeenCalledWith("notif-001", "delivered");
		});

		it("accepts email.bounced and sets deliveryStatus to bounced", async () => {
			const notification = makeNotification({
				deliveryExternalId: "email-bounce",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue({
				...notification,
				deliveryStatus: "bounced" satisfies DeliveryStatus,
			});

			const body = JSON.stringify({
				type: "email.bounced",
				data: { email_id: "email-bounce" },
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.handled).toBe(true);
			expect(json.deliveryStatus).toBe("bounced");
		});

		it("accepts email.complained and sets deliveryStatus to complained", async () => {
			const notification = makeNotification({
				deliveryExternalId: "email-spam",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const body = JSON.stringify({
				type: "email.complained",
				data: { email_id: "email-spam" },
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await invokeEndpoint(webhook, ctx);
			const json = await res.json();
			expect(json.handled).toBe(true);
			expect(json.deliveryStatus).toBe("complained");
		});

		it("returns handled:false for unknown event types", async () => {
			const body = JSON.stringify({
				type: "email.opened",
				data: { email_id: "email-abc" },
			});
			const ctx = makeCtx(body);

			const res = await invokeEndpoint(webhook, ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
		});

		it("returns handled:false when notification not found", async () => {
			const findSpy = vi.fn().mockResolvedValue(null);

			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "unknown-id" },
			});
			const ctx = makeCtx(body, {}, { findByExternalId: findSpy });

			const res = await invokeEndpoint(webhook, ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
		});

		it("returns handled:false when delivery status is already up to date", async () => {
			const notification = makeNotification({
				deliveryExternalId: "email-abc",
				deliveryStatus: "delivered",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn();

			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-abc" },
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await invokeEndpoint(webhook, ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
			expect(updateSpy).not.toHaveBeenCalled();
		});

		it("returns 400 for invalid JSON body", async () => {
			const ctx = makeCtx("not-json");

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(400);
		});

		it("returns handled:false when email_id is missing", async () => {
			const body = JSON.stringify({
				type: "email.delivered",
				data: {},
			});
			const ctx = makeCtx(body);

			const res = await invokeEndpoint(webhook, ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
		});
	});

	describe("with webhook secret (production mode)", () => {
		const webhook = createResendWebhook({ webhookSecret: WEBHOOK_SECRET });

		it("accepts a valid Svix-signed request", async () => {
			const notification = makeNotification({
				deliveryExternalId: "email-signed",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-signed" },
			});
			const msgId = "msg_abc123";
			const timestamp = String(Math.floor(Date.now() / 1000));
			const signature = await signSvix(msgId, timestamp, body, WEBHOOK_SECRET);

			const ctx = makeCtx(
				body,
				{
					"svix-id": msgId,
					"svix-timestamp": timestamp,
					"svix-signature": signature,
				},
				{ findByExternalId: findSpy, updateDeliveryStatus: updateSpy },
			);

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.handled).toBe(true);
		});

		it("rejects requests with wrong signature", async () => {
			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-abc" },
			});
			const msgId = "msg_abc123";
			const timestamp = String(Math.floor(Date.now() / 1000));

			const ctx = makeCtx(body, {
				"svix-id": msgId,
				"svix-timestamp": timestamp,
				"svix-signature": "v1,invalidsignature==",
			});

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(401);
		});

		it("rejects requests with missing Svix headers", async () => {
			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-abc" },
			});
			const ctx = makeCtx(body);

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(400);
		});

		it("rejects replayed events with old timestamp", async () => {
			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-abc" },
			});
			const msgId = "msg_old";
			// 10 minutes ago
			const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
			const signature = await signSvix(
				msgId,
				oldTimestamp,
				body,
				WEBHOOK_SECRET,
			);

			const ctx = makeCtx(body, {
				"svix-id": msgId,
				"svix-timestamp": oldTimestamp,
				"svix-signature": signature,
			});

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(401);
		});

		it("accepts events with multiple valid signatures in svix-signature header", async () => {
			const notification = makeNotification({
				deliveryExternalId: "email-multi",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const body = JSON.stringify({
				type: "email.delivered",
				data: { email_id: "email-multi" },
			});
			const msgId = "msg_multi";
			const timestamp = String(Math.floor(Date.now() / 1000));
			const realSig = await signSvix(msgId, timestamp, body, WEBHOOK_SECRET);

			// Multiple signatures: one invalid, one valid
			const multiSig = `v1,invalidsignature== ${realSig}`;

			const ctx = makeCtx(
				body,
				{
					"svix-id": msgId,
					"svix-timestamp": timestamp,
					"svix-signature": multiSig,
				},
				{ findByExternalId: findSpy, updateDeliveryStatus: updateSpy },
			);

			const res = await invokeEndpoint(webhook, ctx);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.handled).toBe(true);
		});
	});
});
