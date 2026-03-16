import { createAdminEndpoint, z } from "@86d-app/core";
import type { UberDirectController } from "../../service";

export const listQuotes = createAdminEndpoint(
	"/admin/uber-direct/quotes",
	{
		method: "GET",
		query: z.object({
			status: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.uberDirect as UberDirectController;
		const quotes = await controller.listQuotes({
			status: ctx.query.status,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { quotes, total: quotes.length };
	},
);
