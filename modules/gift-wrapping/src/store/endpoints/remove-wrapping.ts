import { createStoreEndpoint, z } from "@86d-app/core";
import type { GiftWrappingController } from "../../service";

export const removeWrapping = createStoreEndpoint(
	"/gift-wrapping/remove",
	{
		method: "POST",
		body: z.object({
			selectionId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.giftWrapping as GiftWrappingController;
		const removed = await controller.removeSelection(ctx.body.selectionId);
		return { removed };
	},
);
