import { createStoreEndpoint, z } from "@86d-app/core";
import type { WalmartController } from "../../service";

export const webhookEndpoint = createStoreEndpoint(
	"/walmart/webhooks",
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
		const controller = ctx.context.controllers.walmart as WalmartController;
		const { type, payload } = ctx.body;

		if (type === "order.created" && payload.purchaseOrderId) {
			const order = await controller.receiveOrder({
				purchaseOrderId: payload.purchaseOrderId as string,
				items: (payload.items as unknown[]) ?? [],
				orderTotal: (payload.orderTotal as number) ?? 0,
				shippingTotal: (payload.shippingTotal as number) ?? 0,
				walmartFee: (payload.walmartFee as number) ?? 0,
				tax: (payload.tax as number) ?? 0,
				customerName: payload.customerName as string | undefined,
				shippingAddress:
					(payload.shippingAddress as Record<string, unknown>) ?? {},
			});
			return { received: true, orderId: order.id };
		}

		return { received: true };
	},
);
