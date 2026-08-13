import { createStoreEndpoint } from "@86d-app/core/api";
import { z } from "@86d-app/core/zod";
import type { CheckoutController } from "../../service";
import { canAccessCheckout } from "./guest-proof";

export const getShippingRates = createStoreEndpoint(
	"/checkout/sessions/:id/shipping-rates",
	{
		method: "GET",
		params: z.object({ id: z.string().max(200) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const session = await controller.getById(ctx.params.id);
		if (!session) {
			return { error: "Checkout session not found", status: 404 };
		}

		if (!(await canAccessCheckout(ctx, session))) {
			return { error: "Checkout session not found", status: 404 };
		}

		return {
			code: "CHECKOUT_SHIPPING_QUOTE_V2_REQUIRED",
			error:
				"Shipping quotes require an expiring, revision-bound Store option.",
			status: 503,
		};
	},
);
