import { createStoreEndpoint, z } from "@86d-app/core";
import type { GiftWrappingController } from "../../service";

export const selectWrapping = createStoreEndpoint(
	"/gift-wrapping/select",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1),
			orderItemId: z.string().min(1),
			wrapOptionId: z.string().min(1),
			recipientName: z.string().max(200).optional(),
			giftMessage: z.string().max(500).optional(),
			customerId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.giftWrapping as GiftWrappingController;
		const params: import("../../service").SelectWrappingParams = {
			orderId: ctx.body.orderId,
			orderItemId: ctx.body.orderItemId,
			wrapOptionId: ctx.body.wrapOptionId,
		};
		if (ctx.body.recipientName != null)
			params.recipientName = ctx.body.recipientName;
		if (ctx.body.giftMessage != null) params.giftMessage = ctx.body.giftMessage;
		if (ctx.body.customerId != null) params.customerId = ctx.body.customerId;
		const selection = await controller.selectWrapping(params);
		return { selection };
	},
);
