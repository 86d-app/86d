import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { LoyaltyController } from "../../service";

export const redeem = createStoreEndpoint(
	"/loyalty/redeem",
	{
		method: "POST",
		body: z.object({
			customerId: z.string(),
			points: z.number().int().min(1),
			description: z.string().max(500).transform(sanitizeText),
			orderId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.loyalty as LoyaltyController;
		const transaction = await controller.redeemPoints({
			customerId: ctx.body.customerId,
			points: ctx.body.points,
			description: ctx.body.description,
			orderId: ctx.body.orderId,
		});
		return { transaction };
	},
);
