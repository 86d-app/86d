import { createStoreEndpoint, z } from "@86d-app/core";
import type { FacebookShopController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/facebook-shop/webhooks",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(200),
			payload: z.record(z.string().max(100), z.unknown()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.facebookShop as FacebookShopController;
		const { type, payload } = ctx.body;

		switch (type) {
			case "order.created": {
				if (!payload.externalOrderId) return { received: true };
				const order = await controller.receiveOrder({
					externalOrderId: payload.externalOrderId as string,
					status:
						(payload.status as "pending" | "confirmed" | undefined) ??
						"pending",
					items: (payload.items as unknown[]) ?? [],
					subtotal: (payload.subtotal as number) ?? 0,
					shippingFee: (payload.shippingFee as number) ?? 0,
					platformFee: (payload.platformFee as number) ?? 0,
					total: (payload.total as number) ?? 0,
					customerName: payload.customerName as string | undefined,
					shippingAddress:
						(payload.shippingAddress as Record<string, unknown>) ?? {},
				});
				return { received: true, orderId: order.id };
			}

			case "order.shipped": {
				if (!payload.orderId || !payload.trackingNumber)
					return { received: true };
				const order = await controller.updateOrderStatus(
					payload.orderId as string,
					"shipped",
					payload.trackingNumber as string,
					payload.trackingUrl as string | undefined,
				);
				return { received: true, orderId: order?.id };
			}

			case "order.cancelled": {
				if (!payload.orderId) return { received: true };
				const order = await controller.updateOrderStatus(
					payload.orderId as string,
					"cancelled",
				);
				return { received: true, orderId: order?.id };
			}

			case "product.sync": {
				const result = await controller.syncProducts();
				return { received: true, synced: result.synced };
			}

			case "order.sync": {
				const result = await controller.syncOrders();
				return { received: true, synced: result.synced };
			}

			case "catalog.sync": {
				const sync = await controller.syncCatalog();
				return { received: true, syncId: sync.id };
			}

			default:
				return { received: true };
		}
	},
);
