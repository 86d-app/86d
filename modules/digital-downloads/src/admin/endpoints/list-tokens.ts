import { createAdminEndpoint, z } from "@86d-app/core";
import type { DigitalDownloadsController } from "../../service";

export const listTokens = createAdminEndpoint(
	"/admin/downloads/tokens",
	{
		method: "GET",
		query: z.object({
			fileId: z.string().optional(),
			orderId: z.string().optional(),
			email: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"digital-downloads"
		] as DigitalDownloadsController;
		const tokens = await controller.listTokens({
			fileId: ctx.query.fileId,
			orderId: ctx.query.orderId,
			email: ctx.query.email,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { tokens, total: tokens.length };
	},
);
