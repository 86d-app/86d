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
			return {
				code: "CHECKOUT_SHIPPING_UNAVAILABLE",
				error: "An authoritative shipping decision is unavailable.",
				status: 503,
			};
		}

		const lineItems = await controller.getLineItems(session.id);
		const orderAmount = lineItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);

		let rates: Awaited<ReturnType<ShippingRateController["calculateRates"]>>;
		try {
			rates = await shippingController.calculateRates({
				country: (session.shippingAddress as { country: string }).country,
				orderAmount,
			});
		} catch {
			return {
				code: "CHECKOUT_SHIPPING_UNAVAILABLE",
				error: "An authoritative shipping decision is unavailable.",
				status: 503,
			};
		}

		if (rates.length === 0) {
			return {
				code: "CHECKOUT_SHIPPING_UNAVAILABLE",
				error: "No authoritative shipping option is available.",
				status: 422,
			};
		}

		return { rates };
	},
);
