import { createAdminEndpoint, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const listTickets = createAdminEndpoint(
	"/admin/tickets",
	{
		method: "GET",
		query: z
			.object({
				status: z.string().optional(),
				priority: z.string().optional(),
				categoryId: z.string().optional(),
				assigneeId: z.string().optional(),
				customerEmail: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tickets as TicketController;
		const { query = {} } = ctx;

		// biome-ignore lint/suspicious/noExplicitAny: dynamic filter construction
		const tickets = await controller.listTickets(query as any);

		return { tickets };
	},
);
