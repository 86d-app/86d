import { createStoreEndpoint, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const customerTickets = createStoreEndpoint(
	"/tickets/mine",
	{
		method: "GET",
		query: z.object({}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers.tickets as TicketController;

		const tickets = await controller.listTickets({
			customerEmail: session.user.email,
		});

		return { tickets };
	},
);
