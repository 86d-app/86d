import { createStoreEndpoint, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const customerReply = createStoreEndpoint(
	"/tickets/:id/reply",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
		body: z.object({
			body: z.string().min(1).max(5000),
			customerEmail: z.string().email(),
			customerName: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tickets as TicketController;

		const ticket = await controller.getTicket(ctx.params.id);
		if (!ticket) {
			return { error: "Ticket not found", status: 404 };
		}

		// Verify the reply is from the ticket owner
		if (ticket.customerEmail !== ctx.body.customerEmail) {
			return { error: "Ticket not found", status: 404 };
		}

		if (ticket.status === "closed") {
			return { error: "Ticket is closed", status: 400 };
		}

		const message = await controller.addMessage({
			ticketId: ticket.id,
			body: ctx.body.body,
			authorType: "customer",
			authorName: ctx.body.customerName,
			authorEmail: ctx.body.customerEmail,
		});

		return { message };
	},
);
