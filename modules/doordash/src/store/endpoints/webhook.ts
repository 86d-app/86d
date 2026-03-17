import { createStoreEndpoint } from "@86d-app/core";
import { mapDriveStatusToInternal } from "../../provider";
import type { DoordashController } from "../../service";

/**
 * DoorDash Drive webhook event names.
 * See: https://developer.doordash.com/en-US/docs/drive/reference/webhooks
 */
type DriveWebhookEvent =
	| "DASHER_CONFIRMED"
	| "DASHER_CONFIRMED_PICKUP_ARRIVAL"
	| "DASHER_PICKED_UP"
	| "DASHER_CONFIRMED_DROPOFF_ARRIVAL"
	| "DASHER_DROPPED_OFF"
	| "DELIVERY_CANCELLED"
	| "DELIVERY_RETURN_INITIALIZED"
	| "DASHER_CONFIRMED_RETURN_ARRIVAL"
	| "DELIVERY_RETURNED"
	| "DELIVERY_BATCHED";

/** Map DoorDash webhook event names to Drive delivery statuses. */
const EVENT_TO_STATUS: Record<string, string> = {
	DASHER_CONFIRMED: "confirmed",
	DASHER_CONFIRMED_PICKUP_ARRIVAL: "arrived_at_pickup",
	DASHER_PICKED_UP: "picked_up",
	DASHER_CONFIRMED_DROPOFF_ARRIVAL: "arrived_at_dropoff",
	DASHER_DROPPED_OFF: "delivered",
	DELIVERY_CANCELLED: "cancelled",
};

interface WebhookPayload {
	external_delivery_id: string;
	event_name: DriveWebhookEvent;
	dasher_id?: number | undefined;
	dasher_name?: string | undefined;
	pickup_address?: string | undefined;
	dropoff_address?: string | undefined;
	pickup_time_actual?: string | undefined;
	dropoff_time_actual?: string | undefined;
	order_value?: number | undefined;
	currency?: string | undefined;
	fee?: number | undefined;
	tip?: number | undefined;
	created_at?: string | undefined;
	support_reference?: string | undefined;
}

/**
 * Create the DoorDash webhook endpoint.
 * DoorDash uses Basic Auth or OAuth for webhook authentication (configured in
 * the DoorDash developer portal). There is no HMAC signature to verify —
 * authentication is handled at the HTTP transport level.
 */
export function createDoordashWebhook() {
	return createStoreEndpoint(
		"/doordash/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		// biome-ignore lint/suspicious/noExplicitAny: endpoint handler requires raw request access
		async (ctx: any): Promise<Response> => {
			const request = ctx.request as Request;

			let payload: WebhookPayload;
			try {
				payload = (await request.json()) as WebhookPayload;
			} catch {
				return Response.json({ error: "Invalid JSON body." }, { status: 400 });
			}

			if (!payload.external_delivery_id || !payload.event_name) {
				return Response.json(
					{ error: "Missing external_delivery_id or event_name." },
					{ status: 400 },
				);
			}

			const controller = ctx.context?.controllers
				?.doordash as DoordashController;
			// biome-ignore lint/suspicious/noExplicitAny: scoped event emitter
			const events = ctx.context?.events as any;

			void events?.emit("doordash.webhook.received", {
				eventName: payload.event_name,
				externalDeliveryId: payload.external_delivery_id,
			});

			// Map event to internal status
			const driveStatus = EVENT_TO_STATUS[payload.event_name];
			if (!driveStatus || !controller) {
				return Response.json({
					received: true,
					event: payload.event_name,
					handled: false,
				});
			}

			// Find delivery by external ID
			const deliveries = await controller.listDeliveries();
			const delivery = deliveries.find(
				(d) => d.externalDeliveryId === payload.external_delivery_id,
			);

			if (!delivery) {
				return Response.json({
					received: true,
					event: payload.event_name,
					handled: false,
					reason: "delivery_not_found",
				});
			}

			// Map Drive status to our internal status and update
			const internalStatus = mapDriveStatusToInternal(
				driveStatus as Parameters<typeof mapDriveStatusToInternal>[0],
			);

			if (internalStatus === "cancelled") {
				await controller.cancelDelivery(delivery.id);
			} else {
				await controller.updateDeliveryStatus(delivery.id, internalStatus);
			}

			return Response.json({
				received: true,
				event: payload.event_name,
				handled: true,
				deliveryId: delivery.id,
			});
		},
	);
}
