import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { LoyaltyController } from "../../service";

export const adjustPoints = createAdminEndpoint(
	"/admin/loyalty/accounts/:customerId/adjust",
	{
		method: "POST",
		params: z.object({
			customerId: z.string(),
		}),
		body: z.object({
			points: z.number().int(),
			description: z.string().max(1000).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.loyalty as LoyaltyController;
		const transaction = await controller.adjustPoints({
			customerId: ctx.params.customerId,
			points: ctx.body.points,
			description: ctx.body.description,
		});
		const account = await controller.getAccount(ctx.params.customerId);
		return { transaction, account };
	},
);
