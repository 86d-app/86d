import { createAdminEndpoint, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const closeTicket = createAdminEndpoint(
	"/admin/tickets/:id/close",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tickets as TicketController;

		const ticket = await controller.closeTicket(ctx.params.id);

		return { ticket };
	},
);
