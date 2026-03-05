import { createStoreEndpoint, z } from "@86d-app/core";
import type { NewsletterController } from "../../service";

export const unsubscribeEndpoint = createStoreEndpoint(
	"/newsletter/unsubscribe",
	{
		method: "POST",
		body: z.object({
			email: z.string().email(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.newsletter as NewsletterController;
		const subscriber = await controller.unsubscribe(ctx.body.email);
		return { subscriber };
	},
);
