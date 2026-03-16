import { createAdminEndpoint, z } from "@86d-app/core";
import type { TippingController } from "../../service";

export const listTips = createAdminEndpoint(
	"/admin/tipping/tips",
	{
		method: "GET",
		query: z.object({
			orderId: z.string().optional(),
			recipientId: z.string().optional(),
			status: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tipping as TippingController;
		const tips = await controller.listTips({
			orderId: ctx.query.orderId,
			recipientId: ctx.query.recipientId,
			status: ctx.query.status,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { tips, total: tips.length };
	},
);
