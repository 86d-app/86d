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

		if (type === "order.created" && payload.amazonOrderId) {
			const order = await controller.receiveOrder({
				amazonOrderId: payload.amazonOrderId as string,
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

		return { received: true };
	},
);
