import { createStoreEndpoint, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const customerTickets = createStoreEndpoint(
	"/tickets/mine",
	{
		method: "GET",
		query: z.object({
			email: z.string().email(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tickets as TicketController;

		const tickets = await controller.listTickets({
			customerEmail: ctx.query.email,
		});

		return { tickets };
	},
);
