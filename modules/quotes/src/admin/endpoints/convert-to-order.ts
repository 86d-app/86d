import { createAdminEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const convertToOrderEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/convert",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
			orderId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.convertToOrder(
			ctx.body.id,
			ctx.body.orderId,
		);
		if (!quote) return { error: "Cannot convert this quote to an order" };
		return { quote };
	},
);
