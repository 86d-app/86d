import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	InventoryCheckController,
	PaymentProcessController,
} from "../../service";

export const abandonSession = createStoreEndpoint(
	"/checkout/sessions/:id/abandon",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const existing = await controller.getById(ctx.params.id);
		if (!existing) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Ownership check
		const userId = ctx.context.session?.user.id;
		if (existing.customerId && userId && existing.customerId !== userId) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Remember if stock was reserved (processing = stock reserved)
		const wasProcessing = existing.status === "processing";

		const session = await controller.abandon(ctx.params.id);
		if (!session) {
			return { error: "Cannot abandon this checkout session", status: 422 };
		}

		// Release inventory reservations if stock was reserved
		if (wasProcessing) {
			const inventoryController = ctx.context.controllers
				.inventory as unknown as InventoryCheckController | undefined;

			if (inventoryController) {
				const lineItems = await controller.getLineItems(ctx.params.id);
				for (const item of lineItems) {
					await inventoryController.release({
						productId: item.productId,
						variantId: item.variantId,
						quantity: item.quantity,
					});
				}
			}
		}

		// Cancel payment intent if one was created
		if (
			existing.paymentIntentId &&
			existing.paymentIntentId !== "no_payment_required" &&
			!existing.paymentIntentId.startsWith("demo_")
		) {
			const paymentController = ctx.context.controllers.payments as unknown as
				| PaymentProcessController
				| undefined;

			if (paymentController) {
				await paymentController.cancelIntent(existing.paymentIntentId);
			}
		}

		return { session };
	},
);
