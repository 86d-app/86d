import { createStoreEndpoint, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const getTicket = createStoreEndpoint(
	"/tickets/:id",
	{
		method: "GET",
		params: z.object({
			id: z.string(),
		}),
		query: z
			.object({
				email: z.string().email(),
			})
			.optional(),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tickets as TicketController;
		const { query } = ctx;

		const ticket = await controller.getTicket(ctx.params.id);
		if (!ticket) {
			return { error: "Ticket not found", status: 404 };
		}

		// Customers must provide their email to view a ticket
		if (query?.email && ticket.customerEmail !== query.email) {
			return { error: "Ticket not found", status: 404 };
		}

		const messages = await controller.listMessages(ticket.id, {
			includeInternal: false,
		});

		return { ticket, messages };
	},
);
