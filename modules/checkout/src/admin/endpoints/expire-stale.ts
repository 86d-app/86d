import {
	createAdminEndpoint,
	inventoryCheckoutCapability,
	paymentCheckoutCapability,
} from "@86d-app/core";
import type { CheckoutController } from "../../service";

export const adminExpireStale = createAdminEndpoint(
	"/admin/checkout/expire-stale",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const { expired, processingSessions } = await controller.expireStale();

		let inventoryReleased = 0;
		let paymentsCancelled = 0;

		// Release inventory and cancel payments for sessions that were in "processing"
		if (processingSessions.length > 0) {
			for (const session of processingSessions) {
				// Release reserved inventory
				if (ctx.context.modules.includes("inventory")) {
					const lineItems = await controller.getLineItems(session.id);
					for (const item of lineItems) {
						const released = await ctx.context.capabilities.invoke(
							inventoryCheckoutCapability,
							{
								operation: "release",
								productId: item.productId,
								...(item.variantId ? { variantId: item.variantId } : {}),
								quantity: item.quantity,
							},
						);
						if (!released.ok) {
							return {
								code: "CHECKOUT_INVENTORY_UNAVAILABLE",
								error: "Inventory reservations could not be released.",
								status: 503,
							};
						}
					}
					inventoryReleased++;
				}

				// Cancel payment intent if one was created
				if (
					session.paymentIntentId &&
					session.paymentIntentId !== "no_payment_required"
				) {
					const cancelled = await ctx.context.capabilities.invoke(
						paymentCheckoutCapability,
						{ operation: "cancel", intentId: session.paymentIntentId },
					);
					if (!cancelled.ok) {
						return {
							code: "CHECKOUT_PAYMENT_UNAVAILABLE",
							error: "A checkout payment could not be cancelled.",
							status: 503,
						};
					}
					paymentsCancelled++;
				}
			}
		}

		return { expired, inventoryReleased, paymentsCancelled };
	},
);
