import { createStoreEndpoint, z } from "@86d-app/core";
import type { CheckoutController, ShippingRateController } from "../../service";

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

		// Ownership check
		const userId = ctx.context.session?.user.id;
		if (session.customerId && (!userId || session.customerId !== userId)) {
			return { error: "Checkout session not found", status: 404 };
		}

		if (!session.shippingAddress) {
			return {
				error: "Shipping address is required to get rates",
				status: 422,
			};
		}

		const shippingController = ctx.context.controllers.shipping as unknown as
			| ShippingRateController
			| undefined;

		if (!shippingController?.calculateRates) {
			// Shipping module not installed — return empty rates so the UI
			// can fall back to free shipping or a manual amount.
			return { rates: [] };
		}

		const lineItems = await controller.getLineItems(session.id);
		const orderAmount = lineItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);

		const rates = await shippingController.calculateRates({
			country: (session.shippingAddress as { country: string }).country,
			orderAmount,
		});

		return { rates };
	},
);
