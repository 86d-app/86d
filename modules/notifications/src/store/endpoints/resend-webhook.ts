import { createStoreEndpoint } from "@86d-app/core";
import type { DeliveryStatus, NotificationsController } from "../../service";

/**
 * Resend webhook endpoint — receives delivery status events (email.delivered,
 * email.bounced, email.complained) and updates the matching notification record.
 *
 * Resend uses Svix for webhook delivery. Each request carries three headers:
 *   svix-id        — unique message ID
 *   svix-timestamp — Unix seconds (must be within 5 minutes)
 *   svix-signature — space-separated list of "v1,<base64-hmac-sha256>" signatures
 *
 * The signed payload is: `${svixId}.${svixTimestamp}.${rawBody}`
 * The key is the raw bytes of the webhook signing secret.
 *
 * When no secret is configured the endpoint accepts all events (dev mode).
 */

const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface ResendWebhookData {
	email_id: string;
	from?: string;
	to?: string[];
	subject?: string;
	created_at?: string;
	bounce?: { message?: string } | null;
	complaint?: { userAgent?: string } | null;
}

interface ResendWebhookEvent {
	type: string;
	data: ResendWebhookData;
}

async function verifySvixSignature(
	rawBody: string,
	svixId: string,
	svixTimestamp: string,
	svixSignature: string,
	secret: string,
): Promise<boolean> {
	// Replay-attack guard: reject events older than 5 minutes
	const ts = Number(svixTimestamp) * 1000;
	if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > FIVE_MINUTES_MS) {
		return false;
	}

	const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sigBytes = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(toSign),
	);
	const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

	// svix-signature may contain multiple signatures ("v1,<b64> v1,<b64>")
	const candidates = svixSignature.split(" ");
	for (const candidate of candidates) {
		const parts = candidate.split(",");
		if (parts.length === 2 && parts[0] === "v1" && parts[1] === expected) {
			return true;
		}
	}
	return false;
}

function mapResendStatusToDelivery(eventType: string): DeliveryStatus | null {
	switch (eventType) {
		case "email.delivered":
			return "delivered";
		case "email.bounced":
			return "bounced";
		case "email.complained":
			return "complained";
		case "email.delivery_delayed":
		case "email.sent":
			return "sent";
		default:
			return null;
	}
}

export function createResendWebhook(opts: {
	webhookSecret?: string | undefined;
}) {
	return createStoreEndpoint(
		"/notifications/webhook/resend",
		{
			method: "POST",
			requireRequest: true,
		},
		async (ctx) => {
			const request = ctx.request;
			const rawBody = await request.text();

			if (opts.webhookSecret) {
				const svixId = request.headers.get("svix-id") ?? "";
				const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
				const svixSignature = request.headers.get("svix-signature") ?? "";

				if (!svixId || !svixTimestamp || !svixSignature) {
					return Response.json(
						{ error: "Missing Svix webhook headers." },
						{ status: 400 },
					);
				}

				const valid = await verifySvixSignature(
					rawBody,
					svixId,
					svixTimestamp,
					svixSignature,
					opts.webhookSecret,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid webhook signature." },
						{ status: 401 },
					);
				}
			}

			let event: ResendWebhookEvent;
			try {
				event = JSON.parse(rawBody) as ResendWebhookEvent;
			} catch {
				return Response.json({ error: "Invalid JSON body." }, { status: 400 });
			}

			const emailId = event.data?.email_id;
			if (!emailId || typeof emailId !== "string") {
				return Response.json({ received: true, handled: false });
			}

			const deliveryStatus = mapResendStatusToDelivery(event.type);
			if (!deliveryStatus) {
				return Response.json({ received: true, handled: false });
			}

			const notifications = ctx.context?.controllers?.notifications as
				| NotificationsController
				| undefined;
			if (!notifications) {
				return Response.json({ received: true, handled: false });
			}

			const notification = await notifications
				.findByExternalId(emailId)
				.catch(() => null);
			if (!notification) {
				return Response.json({ received: true, handled: false });
			}

			if (notification.deliveryStatus === deliveryStatus) {
				return Response.json({ received: true, handled: false });
			}

			await notifications
				.updateDeliveryStatus(notification.id, deliveryStatus)
				.catch(() => null);

			return Response.json({
				received: true,
				handled: true,
				notificationId: notification.id,
				deliveryStatus,
			});
		},
	);
}
