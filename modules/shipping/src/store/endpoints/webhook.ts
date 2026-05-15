import { createStoreEndpoint } from "@86d-app/core";
import {
	type EasyPostTrackingStatus,
	mapEasyPostStatusToInternal,
} from "../../provider";
import type { ShippingController } from "../../service";

/**
 * EasyPost webhook endpoint — handles tracker events to keep shipment status
 * in sync with real carrier data.
 *
 * Signature verification uses HMAC-SHA256 with the `X-Hmac-Sha256-Signature-2`
 * header. When no secret is configured the endpoint still accepts events
 * (useful for local development), but production deployments should always
 * set `easypostWebhookSecret`.
 */

interface EasyPostTrackerResult {
	id: string;
	object: string;
	tracking_code: string;
	status: EasyPostTrackingStatus;
	carrier?: string;
	public_url?: string;
	est_delivery_date?: string | null;
}

interface EasyPostWebhookEvent {
	id: string;
	object: string;
	description: string;
	result: EasyPostTrackerResult;
}

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

async function verifyEasyPostSignature(
	rawBody: string,
	signatureHeader: string,
	secret: string,
): Promise<boolean> {
	const expected = await hmacSha256Hex(secret, rawBody);
	return timingSafeEqual(signatureHeader, expected);
}

export function createShippingWebhook(opts: {
	webhookSecret?: string | undefined;
}) {
	return createStoreEndpoint(
		"/shipping/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		async (ctx) => {
			const request = ctx.request;
			const rawBody = await request.text();

			if (opts.webhookSecret) {
				const sigHeader =
					request.headers.get("x-hmac-sha256-signature-2") ?? "";
				const valid = await verifyEasyPostSignature(
					rawBody,
					sigHeader,
					opts.webhookSecret,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid webhook signature." },
						{ status: 401 },
					);
				}
			}

			let event: EasyPostWebhookEvent;
			try {
				event = JSON.parse(rawBody) as EasyPostWebhookEvent;
			} catch {
				return Response.json({ error: "Invalid JSON body." }, { status: 400 });
			}

			if (
				event.object !== "Event" ||
				!event.description?.startsWith("tracker.")
			) {
				return Response.json({ received: true, handled: false });
			}

			const tracker = event.result;
			if (!tracker || tracker.object !== "Tracker" || !tracker.tracking_code) {
				return Response.json({ received: true, handled: false });
			}

			const shipping = ctx.context?.controllers?.shipping as
				| ShippingController
				| undefined;
			const events = ctx.context?.events;

			if (!shipping) {
				return Response.json({ received: true, handled: false });
			}

			const shipment = await shipping
				.findShipmentByTrackingNumber(tracker.tracking_code)
				.catch(() => null);

			if (!shipment) {
				return Response.json({ received: true, handled: false });
			}

			const internalStatus = mapEasyPostStatusToInternal(tracker.status);

			if (internalStatus === shipment.status) {
				return Response.json({ received: true, handled: false });
			}

			const updated = await shipping
				.updateShipmentStatus(shipment.id, internalStatus)
				.catch(() => null);

			if (updated && events) {
				await events
					.emit(`shipment.${internalStatus}`, {
						shipmentId: updated.id,
						orderId: updated.orderId,
						trackingNumber: updated.trackingNumber,
						status: internalStatus,
					})
					.catch(() => undefined);
			}

			return Response.json({
				received: true,
				handled: true,
				shipmentId: shipment.id,
				status: internalStatus,
			});
		},
	);
}
