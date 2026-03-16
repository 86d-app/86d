import { createStoreEndpoint, z } from "@86d-app/core";
import type { EtsyController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/etsy/webhooks",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(200),
			payload: z.record(z.string().max(100), z.unknown()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.etsy as EtsyController;
		const { type, payload } = ctx.body;

		if (type === "order.created" && payload.etsyReceiptId) {
			const order = await controller.receiveOrder({
				etsyReceiptId: payload.etsyReceiptId as string,
				items: (payload.items as unknown[]) ?? [],
				subtotal: (payload.subtotal as number) ?? 0,
				shippingCost: (payload.shippingCost as number) ?? 0,
				etsyFee: (payload.etsyFee as number) ?? 0,
				processingFee: (payload.processingFee as number) ?? 0,
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
