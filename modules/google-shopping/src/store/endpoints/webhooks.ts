import { createStoreEndpoint, z } from "@86d-app/core";
import type { GoogleShoppingController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/google-shopping/webhooks",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(200),
			payload: z.record(z.string().max(100), z.unknown()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"google-shopping"
		] as GoogleShoppingController;
		const { type, payload } = ctx.body;

		if (type === "order.created" && payload.googleOrderId) {
			const order = await controller.receiveOrder({
				googleOrderId: payload.googleOrderId as string,
				items: (payload.items as unknown[]) ?? [],
				subtotal: (payload.subtotal as number) ?? 0,
				shippingCost: (payload.shippingCost as number) ?? 0,
				tax: (payload.tax as number) ?? 0,
				total: (payload.total as number) ?? 0,
				shippingAddress:
					(payload.shippingAddress as Record<string, unknown>) ?? {},
			});
			return { received: true, orderId: order.id };
		}

		return { received: true };
	},
);
