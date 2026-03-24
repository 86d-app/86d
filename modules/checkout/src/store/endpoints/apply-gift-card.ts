import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	GiftCardCheckController,
} from "../../service";

export const applyGiftCard = createStoreEndpoint(
	"/checkout/sessions/:id/gift-card",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({
			code: z.string().min(1).max(50),
		}),
	},
	async (ctx) => {
		const checkoutController = ctx.context.controllers
			.checkout as CheckoutController;
		const session = await checkoutController.getById(ctx.params.id);
		if (!session) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Ownership check
		const userId = ctx.context.session?.user.id;
		if (session.customerId && (!userId || session.customerId !== userId)) {
			return { error: "Checkout session not found", status: 404 };
		}

		// If gift-cards module is installed, use it to validate balance
		const giftCardController = ctx.context.controllers.giftCards as unknown as
			| GiftCardCheckController
			| undefined;

		let giftCardAmount = 0;

		if (giftCardController) {
			const result = await giftCardController.checkBalance(ctx.body.code);
			if (!result) {
				return { error: "Gift card not found", status: 404 };
			}

			if (result.status !== "active") {
				return {
					error: `Gift card is ${result.status}`,
					status: 400,
				};
			}

			if (result.balance <= 0) {
				return { error: "Gift card has no balance", status: 400 };
			}

			// Cap the gift card amount to the remaining total after discounts
			const remainingTotal =
				session.subtotal +
				session.taxAmount +
				session.shippingAmount -
				session.discountAmount;
			giftCardAmount = Math.min(result.balance, Math.max(0, remainingTotal));
		}

		const updated = await checkoutController.applyGiftCard(ctx.params.id, {
			code: ctx.body.code.toUpperCase(),
			giftCardAmount,
		});

		return { session: updated };
	},
);
