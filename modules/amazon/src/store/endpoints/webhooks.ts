import { createStoreEndpoint, z } from "@86d-app/core";
import type { AmazonController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/amazon/webhooks",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(200),
			payload: z.record(z.string().max(100), z.unknown()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.amazon as AmazonController;
		const { type, payload } = ctx.body;

		switch (type) {
			case "order.created": {
				if (!payload.amazonOrderId) return { received: true };
				const order = await controller.receiveOrder({
					amazonOrderId: payload.amazonOrderId as string,
					status:
						(payload.status as "pending" | "unshipped" | undefined) ??
						"pending",
					fulfillmentChannel:
						(payload.fulfillmentChannel as "FBA" | "FBM" | undefined) ?? "FBM",
					items: (payload.items as unknown[]) ?? [],
					orderTotal: (payload.orderTotal as number) ?? 0,
					shippingTotal: (payload.shippingTotal as number) ?? 0,
					marketplaceFee: (payload.marketplaceFee as number) ?? 0,
					netProceeds: (payload.netProceeds as number) ?? 0,
					buyerName: payload.buyerName as string | undefined,
					shippingAddress:
						(payload.shippingAddress as Record<string, unknown>) ?? {},
				});
				return { received: true, orderId: order.id };
			}

			case "order.shipped": {
				if (!payload.orderId || !payload.trackingNumber)
					return { received: true };
				const order = await controller.shipOrder(
					payload.orderId as string,
					payload.trackingNumber as string,
					(payload.carrier as string) ?? "UNKNOWN",
				);
				return { received: true, orderId: order?.id };
			}

			case "order.cancelled": {
				if (!payload.orderId) return { received: true };
				const order = await controller.cancelOrder(payload.orderId as string);
				return { received: true, orderId: order?.id };
			}

			case "listing.sync": {
				const result = await controller.syncListings();
				return { received: true, synced: result.synced };
			}

			case "inventory.sync": {
				const sync = await controller.syncInventory();
				return { received: true, syncId: sync.id };
			}

			default:
				return { received: true };
		}
	},
);
