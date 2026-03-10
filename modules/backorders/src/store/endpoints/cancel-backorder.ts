import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const cancelBackorder = createStoreEndpoint(
	"/backorders/:id/cancel",
	{
		method: "POST",
		body: z.object({
			reason: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const backorder = await controller.cancelBackorder(
			ctx.params.id,
			ctx.body.reason,
		);
		if (!backorder) {
			return { error: "Backorder not found", cancelled: false };
		}

		if (backorder.customerId !== session.user.id) {
			return { error: "Backorder not found", cancelled: false };
		}

		return { cancelled: true, backorder };
	},
);
