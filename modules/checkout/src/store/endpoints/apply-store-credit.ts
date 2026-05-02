import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	StoreCreditCheckController,
} from "../../service";

export const applyStoreCredit = createStoreEndpoint(
	"/checkout/sessions/:id/store-credit",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const checkoutController = ctx.context.controllers
			.checkout as CheckoutController;
		const session = await checkoutController.getById(ctx.params.id);
		if (!session) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Store credits require an authenticated customer
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Must be signed in to use store credits", status: 401 };
		}

		// Ownership check
		if (session.customerId && session.customerId !== userId) {
			return { error: "Checkout session not found", status: 404 };
		}

		const storeCreditsController = ctx.context.controllers
			.storeCredits as unknown as StoreCreditCheckController | undefined;

		let storeCreditAmount = 0;

		if (storeCreditsController) {
			const balance = await storeCreditsController.getBalance(userId);
			if (balance <= 0) {
				return { error: "No store credit balance available", status: 400 };
			}

			// Cap the store credit amount to the remaining total after discounts and gift cards
			const remainingTotal =
				session.subtotal +
				session.taxAmount +
				session.shippingAmount -
				session.discountAmount -
				session.giftCardAmount;
			storeCreditAmount = Math.min(balance, Math.max(0, remainingTotal));
		}

		const updated = await checkoutController.applyStoreCredit(ctx.params.id, {
			storeCreditAmount,
		});

		return { session: updated };
	},
);
