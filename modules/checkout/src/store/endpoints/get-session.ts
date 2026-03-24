import { createStoreEndpoint, z } from "@86d-app/core";
import type { CheckoutController } from "../../service";

export const getSession = createStoreEndpoint(
	"/checkout/sessions/:id",
	{
		method: "GET",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const session = await controller.getById(ctx.params.id);
		if (!session) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Customers can only access their own sessions
		const userId = ctx.context.session?.user.id;
		if (session.customerId && (!userId || session.customerId !== userId)) {
			return { error: "Checkout session not found", status: 404 };
		}

		const lineItems = await controller.getLineItems(ctx.params.id);
		return { session, lineItems };
	},
);
