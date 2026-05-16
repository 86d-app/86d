import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { DeliveryStatus, Notification } from "../service";
import { createNotificationsController } from "../service-impl";
import { createTwilioWebhook } from "../store/endpoints/twilio-webhook";

const TWILIO_AUTH_TOKEN = "testtwilioauthtoken123456789abc";
const WEBHOOK_URL = "https://store.example.com/notifications/webhook/twilio";

async function computeTwilioSignature(
	authToken: string,
	url: string,
	params: Record<string, string>,
): Promise<string> {
	const sortedKeys = Object.keys(params).sort();
	const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join("");
	const toSign = url + paramString;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(authToken),
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(toSign),
	);
	return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function makeFormBody(params: Record<string, string>): string {
	return new URLSearchParams(params).toString();
}

function makeRequest(
	body: string,
	headers: Record<string, string> = {},
): Request {
	return new Request(WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			...headers,
		},
		body,
	});
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: "notif-001",
		customerId: "cust-001",
		type: "info",
		channel: "both",
		priority: "normal",
		title: "Test",
		body: "Test body",
		metadata: {},
		read: false,
		createdAt: new Date(),
		deliveryExternalId: "SM-twilio-001",
		deliveryStatus: "sent",
		...overrides,
	};
}

function makeCtx(
	formBody: string,
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
		request: makeRequest(formBody, headers),
		context: { controllers: { notifications: controller } },
	};
}

describe("createTwilioWebhook", () => {
	describe("without auth token (dev mode)", () => {
		const webhook = createTwilioWebhook({});

		it("updates delivery status to delivered", async () => {
			const notification = makeNotification({ deliveryExternalId: "SM-001" });
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue({
				...notification,
				deliveryStatus: "delivered" satisfies DeliveryStatus,
			});

			const body = makeFormBody({
				MessageSid: "SM-001",
				MessageStatus: "delivered",
				AccountSid: "ACtest",
				From: "+15555550100",
				To: "+15555550200",
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(204);
			expect(findSpy).toHaveBeenCalledWith("SM-001");
			expect(updateSpy).toHaveBeenCalledWith("notif-001", "delivered");
		});

		it("updates delivery status to failed for undelivered", async () => {
			const notification = makeNotification({ deliveryExternalId: "SM-002" });
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const body = makeFormBody({
				MessageSid: "SM-002",
				MessageStatus: "undelivered",
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(204);
			expect(updateSpy).toHaveBeenCalledWith("notif-001", "failed");
		});

		it("updates delivery status to failed for failed status", async () => {
			const notification = makeNotification({ deliveryExternalId: "SM-003" });
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const body = makeFormBody({
				MessageSid: "SM-003",
				MessageStatus: "failed",
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(204);
			expect(updateSpy).toHaveBeenCalledWith("notif-001", "failed");
		});

		it("returns handled:false for intermediate statuses (queued/sending)", async () => {
			const body = makeFormBody({
				MessageSid: "SM-004",
				MessageStatus: "queued",
			});
			const ctx = makeCtx(body);

			const res = await (webhook as Function)(ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
		});

		it("returns handled:false for sending status", async () => {
			const body = makeFormBody({
				MessageSid: "SM-005",
				MessageStatus: "sending",
			});
			const ctx = makeCtx(body);

			const res = await (webhook as Function)(ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
		});

		it("returns 400 when MessageSid is missing", async () => {
			const body = makeFormBody({ MessageStatus: "delivered" });
			const ctx = makeCtx(body);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(400);
		});

		it("returns handled:false when notification not found for SID", async () => {
			const findSpy = vi.fn().mockResolvedValue(null);

			const body = makeFormBody({
				MessageSid: "SM-unknown",
				MessageStatus: "delivered",
			});
			const ctx = makeCtx(body, {}, { findByExternalId: findSpy });

			const res = await (webhook as Function)(ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
		});

		it("returns handled:false when delivery status already matches", async () => {
			const notification = makeNotification({
				deliveryExternalId: "SM-006",
				deliveryStatus: "delivered",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn();

			const body = makeFormBody({
				MessageSid: "SM-006",
				MessageStatus: "delivered",
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await (webhook as Function)(ctx);
			const json = await res.json();
			expect(json.handled).toBe(false);
			expect(updateSpy).not.toHaveBeenCalled();
		});

		it("falls back to SmsStatus field for older Twilio payloads", async () => {
			const notification = makeNotification({ deliveryExternalId: "SM-007" });
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const body = makeFormBody({
				MessageSid: "SM-007",
				SmsStatus: "delivered",
			});
			const ctx = makeCtx(
				body,
				{},
				{
					findByExternalId: findSpy,
					updateDeliveryStatus: updateSpy,
				},
			);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(204);
			expect(updateSpy).toHaveBeenCalledWith("notif-001", "delivered");
		});
	});

	describe("with auth token and webhook URL (production mode)", () => {
		const webhook = createTwilioWebhook({
			authToken: TWILIO_AUTH_TOKEN,
			webhookUrl: WEBHOOK_URL,
		});

		it("accepts a valid Twilio-signed request", async () => {
			const notification = makeNotification({
				deliveryExternalId: "SM-signed",
			});
			const findSpy = vi.fn().mockResolvedValue(notification);
			const updateSpy = vi.fn().mockResolvedValue(notification);

			const params: Record<string, string> = {
				MessageSid: "SM-signed",
				MessageStatus: "delivered",
				AccountSid: "ACtest",
				From: "+15555550100",
				To: "+15555550200",
			};
			const body = makeFormBody(params);
			const sig = await computeTwilioSignature(
				TWILIO_AUTH_TOKEN,
				WEBHOOK_URL,
				params,
			);

			const ctx = makeCtx(
				body,
				{ "x-twilio-signature": sig },
				{ findByExternalId: findSpy, updateDeliveryStatus: updateSpy },
			);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(204);
			expect(updateSpy).toHaveBeenCalledWith("notif-001", "delivered");
		});

		it("rejects requests with wrong signature", async () => {
			const params: Record<string, string> = {
				MessageSid: "SM-bad",
				MessageStatus: "delivered",
			};
			const body = makeFormBody(params);

			const ctx = makeCtx(body, { "x-twilio-signature": "invalidsig" });

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(401);
		});

		it("rejects requests missing X-Twilio-Signature header", async () => {
			const params: Record<string, string> = {
				MessageSid: "SM-nosig",
				MessageStatus: "delivered",
			};
			const body = makeFormBody(params);
			const ctx = makeCtx(body);

			const res = await (webhook as Function)(ctx);
			expect(res.status).toBe(400);
		});
	});
});
