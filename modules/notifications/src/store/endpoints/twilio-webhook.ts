import { createStoreEndpoint } from "@86d-app/core";
import type { DeliveryStatus, NotificationsController } from "../../service";

/**
 * Twilio StatusCallback endpoint — receives SMS delivery status events and
 * updates the matching notification record.
 *
 * Twilio POSTs URL-encoded form data with:
 *   MessageSid    — the message SID (matches smsDelivery.messageId stored at send time)
 *   MessageStatus — "queued" | "sending" | "sent" | "delivered" | "undelivered" | "failed"
 *   SmsStatus     — same as MessageStatus (older field, kept for compatibility)
 *   AccountSid, From, To, Body, NumSegments
 *
 * Signature verification uses HMAC-SHA1 over: callbackUrl + sorted(formParams).
 * The key is the Twilio Auth Token. The result is base64-encoded and compared
 * with the X-Twilio-Signature header.
 *
 * When no authToken or webhookUrl is provided the endpoint accepts all events.
 */

async function computeTwilioSignature(
	authToken: string,
	url: string,
	params: Record<string, string>,
): Promise<string> {
	// Twilio signature: HMAC-SHA1(authToken, url + sorted params (key+value pairs concatenated))
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
	const sigBytes = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(toSign),
	);
	return btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
}

function mapTwilioStatusToDelivery(status: string): DeliveryStatus | null {
	switch (status) {
		case "delivered":
			return "delivered";
		case "failed":
		case "undelivered":
			return "failed";
		case "sent":
			return "sent";
		default:
			return null;
	}
}

export function createTwilioWebhook(opts: {
	authToken?: string | undefined;
	webhookUrl?: string | undefined;
}) {
	return createStoreEndpoint(
		"/notifications/webhook/twilio",
		{
			method: "POST",
			requireRequest: true,
		},
		async (ctx) => {
			const request = ctx.request;
			const rawBody = await request.text();

			// Parse URL-encoded form body
			const params: Record<string, string> = {};
			for (const [k, v] of new URLSearchParams(rawBody)) {
				params[k] = v;
			}

			if (opts.authToken && opts.webhookUrl) {
				const twilioSig = request.headers.get("x-twilio-signature") ?? "";
				if (!twilioSig) {
					return Response.json(
						{ error: "Missing X-Twilio-Signature header." },
						{ status: 400 },
					);
				}

				const expected = await computeTwilioSignature(
					opts.authToken,
					opts.webhookUrl,
					params,
				);
				if (twilioSig !== expected) {
					return Response.json(
						{ error: "Invalid webhook signature." },
						{ status: 401 },
					);
				}
			}

			const messageSid = params.MessageSid ?? params.SmsSid ?? "";
			const messageStatus = params.MessageStatus ?? params.SmsStatus ?? "";

			if (!messageSid) {
				return Response.json({ error: "Missing MessageSid." }, { status: 400 });
			}

			const deliveryStatus = mapTwilioStatusToDelivery(messageStatus);
			if (!deliveryStatus) {
				// Status is queued/sending — acknowledge but no action needed
				return Response.json({ received: true, handled: false });
			}

			const notifications = ctx.context?.controllers?.notifications as
				| NotificationsController
				| undefined;
			if (!notifications) {
				return Response.json({ received: true, handled: false });
			}

			const notification = await notifications
				.findByExternalId(messageSid)
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

			// Twilio expects a TwiML or empty 2xx response
			return new Response(null, { status: 204 });
		},
	);
}
