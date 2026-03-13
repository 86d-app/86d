import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const joinWaitlist = createStoreEndpoint(
	"/waitlist/join",
	{
		method: "POST",
		body: z.object({
			productId: z.string().max(200),
			productName: z.string().max(500).transform(sanitizeText),
			variantId: z.string().max(200).optional(),
			variantLabel: z.string().max(200).transform(sanitizeText).optional(),
			email: z.string().email().max(320),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const entry = await controller.subscribe({
			productId: ctx.body.productId,
			productName: ctx.body.productName,
			variantId: ctx.body.variantId,
			variantLabel: ctx.body.variantLabel,
			email: ctx.body.email,
			customerId: ctx.context.session?.user?.id,
		});
		return { entry };
	},
);
