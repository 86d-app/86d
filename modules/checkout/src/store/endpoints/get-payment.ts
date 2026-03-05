import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	PaymentProcessController,
} from "../../service";

export const getPayment = createStoreEndpoint(
	"/checkout/sessions/:id/payment/status",
	{
		method: "GET",
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

		// No payment intent yet
		if (!existing.paymentIntentId) {
			return {
				payment: null,
				session: existing,
			};
		}

		// Demo/no-payment intents — return stored status
		if (
			existing.paymentIntentId === "no_payment_required" ||
			existing.paymentIntentId.startsWith("demo_")
		) {
			return {
				payment: {
					id: existing.paymentIntentId,
					status: existing.paymentStatus ?? "succeeded",
					amount: existing.total,
					currency: existing.currency,
				},
				session: existing,
			};
		}

		// Fetch latest status from payments module
		const paymentController = ctx.context.controllers.payments as unknown as
			| PaymentProcessController
			| undefined;

		if (paymentController) {
			const intent = await paymentController.getIntent(
				existing.paymentIntentId,
			);
			if (intent) {
				// Sync status back to session if changed
				if (intent.status !== existing.paymentStatus) {
					await controller.setPaymentIntent(
						ctx.params.id,
						intent.id,
						intent.status,
					);
				}
				return { payment: intent, session: existing };
			}
		}

		// Fallback to stored status
		return {
			payment: {
				id: existing.paymentIntentId,
				status: existing.paymentStatus ?? "pending",
				amount: existing.total,
				currency: existing.currency,
			},
			session: existing,
		};
	},
);
