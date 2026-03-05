import { createAdminEndpoint, z } from "@86d-app/core";
import type { GiftCardController } from "../../service";

export const listGiftCards = createAdminEndpoint(
	"/admin/gift-cards",
	{
		method: "GET",
		query: z.object({
			status: z.string().optional(),
			customerId: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.giftCards as GiftCardController;
		const cards = await controller.list({
			status: ctx.query.status,
			customerId: ctx.query.customerId,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { cards, total: cards.length };
	},
);
