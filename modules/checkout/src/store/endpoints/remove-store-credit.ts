import { createStoreEndpoint, z } from "@86d-app/core";
import type { CheckoutController } from "../../service";

export const removeStoreCredit = createStoreEndpoint(
	"/checkout/sessions/:id/store-credit/remove",
	{
		method: "DELETE",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const existing = await controller.getById(ctx.params.id);
		if (!existing) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Ownership check
		const userId = ctx.context.session?.user.id;
		if (existing.customerId && (!userId || existing.customerId !== userId)) {
			return { error: "Checkout session not found", status: 404 };
		}

		const session = await controller.removeStoreCredit(ctx.params.id);
		if (!session) {
			return { error: "Cannot modify this checkout session", status: 422 };
		}

		return { session };
	},
);
