import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { PreordersController } from "../../service";

export const cancelPreorder = createStoreEndpoint(
	"/preorders/:id/cancel",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
		body: z.object({
			reason: z.string().max(500).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.preorders as PreordersController;
		const item = await controller.cancelPreorderItem(
			ctx.params.id,
			ctx.body.reason,
		);
		if (!item) {
			return { error: "Preorder not found", item: null };
		}
		return { item };
	},
);
