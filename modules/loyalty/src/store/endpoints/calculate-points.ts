import { createStoreEndpoint, z } from "@86d-app/core";
import type { LoyaltyController } from "../../service";

export const calculatePoints = createStoreEndpoint(
	"/loyalty/calculate",
	{
		method: "GET",
		query: z.object({
			amount: z.coerce.number().min(0),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.loyalty as LoyaltyController;
		const points = await controller.calculateOrderPoints(ctx.query.amount);
		return { points, amount: ctx.query.amount };
	},
);
