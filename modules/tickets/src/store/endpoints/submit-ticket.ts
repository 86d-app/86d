import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { TicketController } from "../../service";

export const submitTicket = createStoreEndpoint(
	"/tickets/submit",
	{
		method: "POST",
		body: z.object({
			subject: z.string().min(1).max(200).transform(sanitizeText),
			description: z.string().min(1).max(5000).transform(sanitizeText),
			categoryId: z.string().optional(),
			customerEmail: z.string().email(),
			customerName: z.string().min(1).max(200).transform(sanitizeText),
			customerId: z.string().optional(),
			orderId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tickets as TicketController;

		const ticket = await controller.createTicket(ctx.body);

		return { ticket };
	},
);
