import { createStoreEndpoint, z } from "@86d-app/core";
import type { DoordashController } from "../../service";

export const acceptQuoteEndpoint = createStoreEndpoint(
	"/doordash/quotes/:id/accept",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.doordash as DoordashController;
		const delivery = await controller.acceptQuote(ctx.params.id);
		return { delivery };
	},
);
