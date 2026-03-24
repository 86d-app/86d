import { createStoreEndpoint, z } from "@86d-app/core";
import type { WishController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/wish/webhooks",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(200),
			payload: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 100, {
					message: "Too many fields in payload",
				}),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.wish as WishController;
		const { type, payload } = ctx.body;

		if (type === "order.created" && payload.wishOrderId) {
			const order = await controller.receiveOrder({
				wishOrderId: payload.wishOrderId as string,
				items: (payload.items as unknown[]) ?? [],
				orderTotal: (payload.orderTotal as number) ?? 0,
				shippingTotal: (payload.shippingTotal as number) ?? 0,
				wishFee: (payload.wishFee as number) ?? 0,
				customerName: payload.customerName as string | undefined,
				shippingAddress:
					(payload.shippingAddress as Record<string, unknown>) ?? {},
			});
			return { received: true, orderId: order.id };
		}

		return { received: true };
	},
);
