import { createAdminEndpoint } from "@86d-app/core";
import type {
	CheckoutController,
	InventoryCheckController,
	PaymentProcessController,
} from "../../service";

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
			const inventoryController = ctx.context.controllers
				.inventory as unknown as InventoryCheckController | undefined;
			const paymentController = ctx.context.controllers.payments as unknown as
				| PaymentProcessController
				| undefined;

			for (const session of processingSessions) {
				// Release reserved inventory
				if (inventoryController) {
					const lineItems = await controller.getLineItems(session.id);
					for (const item of lineItems) {
						await inventoryController.release({
							productId: item.productId,
							variantId: item.variantId,
							quantity: item.quantity,
						});
					}
					inventoryReleased++;
				}

				// Cancel payment intent if one was created
				if (
					paymentController &&
					session.paymentIntentId &&
					session.paymentIntentId !== "no_payment_required" &&
					!session.paymentIntentId.startsWith("demo_")
				) {
					await paymentController.cancelIntent(session.paymentIntentId);
					paymentsCancelled++;
				}
			}
		}

		return { expired, inventoryReleased, paymentsCancelled };
	},
);
