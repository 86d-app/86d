import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	PaymentProcessController,
} from "../../service";

/**
 * Capture a payment after the customer has approved it on the provider side
 * (e.g. PayPal approval). The frontend calls this once the customer completes
 * the provider-specific approval flow.
 */
export const capturePayment = createStoreEndpoint(
	"/checkout/sessions/:id/payment/capture",
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
		if (existing.customerId && (!userId || existing.customerId !== userId)) {
			return { error: "Checkout session not found", status: 404 };
		}

		if (existing.status === "completed" || existing.status === "expired") {
			return { error: "Cannot capture payment for this session", status: 422 };
		}

		if (!existing.paymentIntentId) {
			return { error: "No payment intent found for this session", status: 422 };
		}

		const paymentController = ctx.context.controllers.payments as unknown as
			| PaymentProcessController
			| undefined;

		if (!paymentController) {
			return { error: "Payment module not available", status: 500 };
		}

		// Confirm (capture) the payment through the payments module,
		// which delegates to the provider (e.g. PayPal capture order).
		const confirmed = await paymentController.confirmIntent(
			existing.paymentIntentId,
		);

		if (!confirmed) {
			return { error: "Payment intent not found", status: 404 };
		}

		const updated = await controller.setPaymentIntent(
			ctx.params.id,
			confirmed.id,
			confirmed.status,
		);

		return {
			payment: {
				id: confirmed.id,
				status: confirmed.status,
			},
			session: updated,
		};
	},
);
