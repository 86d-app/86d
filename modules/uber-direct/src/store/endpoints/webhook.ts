import { createStoreEndpoint } from "@86d-app/core";
import {
	mapUberStatusToInternal,
	verifyWebhookSignature,
} from "../../provider";
import type { UberDirectController } from "../../service";

/**
 * Uber Direct webhook event types.
 * See: https://developer.uber.com/docs/deliveries/guides/webhooks
 */
type UberWebhookKind =
	| "event.delivery_status"
	| "event.courier_update"
	| "event.refund_request"
	| "event.shopping_progress";

interface WebhookPayload {
	kind: UberWebhookKind;
	id?: string | undefined;
	status?: string | undefined;
	external_id?: string | undefined;
	tracking_url?: string | undefined;
	courier?: {
		name?: string | undefined;
		phone_number?: string | undefined;
		vehicle_type?: string | undefined;
		location?: { lat?: number; lng?: number } | undefined;
	};
	dropoff_eta?: string | undefined;
	pickup_eta?: string | undefined;
	location?: { lat?: number; lng?: number } | undefined;
}

/**
 * Create the Uber Direct webhook endpoint.
 * Uber sends delivery status updates to this endpoint.
 * Signature verification uses HMAC-SHA256 with the webhook signing key.
 */
export function createUberDirectWebhook(signingKey?: string | undefined) {
	return createStoreEndpoint(
		"/uber-direct/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		async (ctx) => {
			const request = ctx.request;

			let rawBody: string;
			try {
				rawBody = await request.text();
			} catch {
				return Response.json(
					{ error: "Failed to read request body." },
					{ status: 400 },
				);
			}

			// Verify signature if signing key is configured
			if (signingKey) {
				const signature =
					request.headers.get("x-uber-signature") ??
					request.headers.get("x-postmates-signature") ??
					"";

				if (!signature) {
					return Response.json(
						{ error: "Missing webhook signature." },
						{ status: 401 },
					);
				}

				const valid = await verifyWebhookSignature(
					rawBody,
					signature,
					signingKey,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid webhook signature." },
						{ status: 401 },
					);
				}
			}

			let payload: WebhookPayload;
			try {
				payload = JSON.parse(rawBody) as WebhookPayload;
			} catch {
				return Response.json({ error: "Invalid JSON body." }, { status: 400 });
			}

			if (!payload.kind) {
				return Response.json({ error: "Missing event kind." }, { status: 400 });
			}

			const controller = ctx.context?.controllers
				?.uberDirect as UberDirectController;
			const events = ctx.context?.events;

			void events?.emit("uber-direct.webhook.received", {
				kind: payload.kind,
				deliveryId: payload.id,
			});

			// Only handle delivery status events
			if (payload.kind !== "event.delivery_status" || !controller) {
				return Response.json({
					received: true,
					kind: payload.kind,
					handled: false,
				});
			}

			if (!payload.id || !payload.status) {
				return Response.json({
					received: true,
					kind: payload.kind,
					handled: false,
					reason: "missing_delivery_id_or_status",
				});
			}

			// Find delivery by external ID
			const deliveries = await controller.listDeliveries();
			const delivery = deliveries.find((d) => d.externalId === payload.id);

			if (!delivery) {
				return Response.json({
					received: true,
					kind: payload.kind,
					handled: false,
					reason: "delivery_not_found",
				});
			}

			// Map Uber status to internal status and update
			const uberStatus = payload.status as Parameters<
				typeof mapUberStatusToInternal
			>[0];
			const internalStatus = mapUberStatusToInternal(uberStatus);

			if (internalStatus === "cancelled") {
				await controller.cancelDelivery(delivery.id);
			} else {
				await controller.updateDeliveryStatus(delivery.id, internalStatus, {
					trackingUrl: payload.tracking_url,
					courierName: payload.courier?.name,
					courierPhone: payload.courier?.phone_number,
					courierVehicle: payload.courier?.vehicle_type,
					...(internalStatus === "picked-up"
						? { actualPickupTime: new Date() }
						: {}),
					...(internalStatus === "delivered"
						? { actualDeliveryTime: new Date() }
						: {}),
				});
			}

			return Response.json({
				received: true,
				kind: payload.kind,
				handled: true,
				deliveryId: delivery.id,
			});
		},
	);
}
