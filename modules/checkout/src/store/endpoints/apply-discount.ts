import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CheckoutController, DiscountController } from "../../service";

export const applyDiscount = createStoreEndpoint(
	"/checkout/sessions/:id/discount",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({
			code: z.string().min(1).max(50).transform(sanitizeText),
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

		// If discount module is installed, use it to validate
		const discountController = ctx.context.controllers.discount as unknown as
			| DiscountController
			| undefined;

		let discountAmount = 0;
		let freeShipping = false;

		if (discountController) {
			const result = await discountController.validateCode({
				code: ctx.body.code,
				subtotal: session.subtotal,
			});

			if (!result.valid) {
				return { error: result.error ?? "Invalid promo code", status: 400 };
			}

			discountAmount = result.discountAmount;
			freeShipping = result.freeShipping;
		}

		const updated = await checkoutController.applyDiscount(ctx.params.id, {
			code: ctx.body.code,
			discountAmount,
			freeShipping,
		});

		return { session: updated };
	},
);
