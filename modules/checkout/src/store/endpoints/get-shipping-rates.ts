import { createStoreEndpoint, shippingQuoteCapability, z } from "@86d-app/core";
import type { CheckoutController } from "../../service";

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

		try {
			const result = await ctx.context.capabilities.invoke(
				shippingQuoteCapability,
				{
					country: session.shippingAddress.country,
					orderAmount: session.subtotal,
				},
			);
			if (!result.ok) {
				return {
					code: "CHECKOUT_SHIPPING_UNAVAILABLE",
					error:
						result.failure.code === "NO_SHIPPING_OPTION"
							? result.failure.message
							: "An authoritative shipping decision is unavailable.",
					status: result.failure.code === "NO_SHIPPING_OPTION" ? 422 : 503,
				};
			}
			return { rates: result.decision.rates };
		} catch {
			return {
				code: "CHECKOUT_SHIPPING_UNAVAILABLE",
				error: "An authoritative shipping decision is unavailable.",
				status: 503,
			};
		}
	},
);
