import {
	createStoreEndpoint,
	inventoryCheckoutCapability,
	paymentCheckoutCapability,
	z,
} from "@86d-app/core";
import type { CheckoutController } from "../../service";

export const abandonSession = createStoreEndpoint(
	"/checkout/sessions/:id/abandon",
	{
		method: "POST",
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

		// Remember if stock was reserved (processing = stock reserved)
		const wasProcessing = existing.status === "processing";

		const session = await controller.abandon(ctx.params.id);
		if (!session) {
			return { error: "Cannot abandon this checkout session", status: 422 };
		}

		// Release inventory reservations if stock was reserved
		if (wasProcessing && ctx.context.modules.includes("inventory")) {
			const lineItems = await controller.getLineItems(ctx.params.id);
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
		}

		// Cancel payment intent if one was created
		if (
			existing.paymentIntentId &&
			existing.paymentIntentId !== "no_payment_required"
		) {
			const cancelled = await ctx.context.capabilities.invoke(
				paymentCheckoutCapability,
				{ operation: "cancel", intentId: existing.paymentIntentId },
			);
			if (!cancelled.ok) {
				return {
					code: "CHECKOUT_PAYMENT_UNAVAILABLE",
					error: "The checkout payment could not be cancelled.",
					status: 503,
				};
			}
		}

		return { session };
	},
);
