import { createStoreEndpoint, z } from "@86d-app/core";
import type { TippingController } from "../../service";

export const updateTip = createStoreEndpoint(
	"/tipping/tips/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
		body: z.object({
			amount: z.number().positive().max(100000).optional(),
			percentage: z.number().min(0).max(100).optional(),
			recipientType: z.enum(["driver", "server", "staff", "store"]).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tipping as TippingController;
		const tip = await controller.updateTip(ctx.params.id, {
			...(ctx.body.amount !== undefined ? { amount: ctx.body.amount } : {}),
			...(ctx.body.percentage !== undefined
				? { percentage: ctx.body.percentage }
				: {}),
			...(ctx.body.recipientType !== undefined
				? { recipientType: ctx.body.recipientType }
				: {}),
		});

		if (!tip) {
			return { error: "Tip not found", status: 404 };
		}

		return { tip };
	},
);
