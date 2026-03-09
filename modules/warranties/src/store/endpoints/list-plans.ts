import { createStoreEndpoint, z } from "@86d-app/core";
import type { WarrantyController } from "../../service";

export const listAvailablePlans = createStoreEndpoint(
	"/warranties/plans",
	{
		method: "GET",
		query: z.object({
			productId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.warranties as WarrantyController;
		const plans = await controller.listPlans({
			productId: ctx.query.productId,
			activeOnly: true,
		});

		return { plans };
	},
);
