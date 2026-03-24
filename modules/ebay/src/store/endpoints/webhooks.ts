import { createStoreEndpoint, z } from "@86d-app/core";
import type { EbayController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/ebay/webhooks",
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
		const controller = ctx.context.controllers.ebay as EbayController;
		const { type, payload } = ctx.body;

		if (type === "order.created" && payload.ebayOrderId) {
			const order = await controller.receiveOrder({
				ebayOrderId: payload.ebayOrderId as string,
				items: (payload.items as unknown[]) ?? [],
				subtotal: (payload.subtotal as number) ?? 0,
				shippingCost: (payload.shippingCost as number) ?? 0,
				ebayFee: (payload.ebayFee as number) ?? 0,
				paymentProcessingFee: (payload.paymentProcessingFee as number) ?? 0,
				total: (payload.total as number) ?? 0,
				buyerUsername: payload.buyerUsername as string | undefined,
				buyerName: payload.buyerName as string | undefined,
				shippingAddress:
					(payload.shippingAddress as Record<string, unknown>) ?? {},
			});
			return { received: true, orderId: order.id };
		}

		return { received: true };
	},
);
