import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	GiftCardCheckController,
	PaymentProcessController,
} from "../../service";

export const completeSession = createStoreEndpoint(
	"/checkout/sessions/:id/complete",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			orderId: z.string().min(1),
		}),
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

		// Verify payment has been processed (unless total is zero)
		if (existing.total > 0) {
			const paymentOk =
				existing.paymentStatus === "succeeded" ||
				existing.paymentIntentId === "no_payment_required";

			if (!paymentOk) {
				// Try to fetch latest status from payments module
				const paymentController = ctx.context.controllers.payments as unknown as
					| PaymentProcessController
					| undefined;

				if (
					paymentController &&
					existing.paymentIntentId &&
					!existing.paymentIntentId.startsWith("demo_")
				) {
					const intent = await paymentController.getIntent(
						existing.paymentIntentId,
					);
					if (intent?.status !== "succeeded") {
						return {
							error: "Payment has not been completed",
							status: 422,
						};
					}
					// Sync the status
					await controller.setPaymentIntent(
						ctx.params.id,
						intent.id,
						intent.status,
					);
				} else if (!existing.paymentIntentId) {
					return {
						error: "Payment has not been initiated",
						status: 422,
					};
				}
			}
		}

		const session = await controller.complete(ctx.params.id, ctx.body.orderId);
		if (!session) {
			return { error: "Cannot complete this checkout session", status: 422 };
		}

		// Redeem gift card balance if one was applied
		if (session.giftCardCode && session.giftCardAmount > 0) {
			const giftCardController = ctx.context.controllers.giftCards as unknown as
				| GiftCardCheckController
				| undefined;

			if (giftCardController) {
				await giftCardController.redeem(
					session.giftCardCode,
					session.giftCardAmount,
					ctx.body.orderId,
				);
			}
		}

		// Emit checkout.completed event for email notifications
		if (ctx.context.events) {
			const lineItems = await controller.getLineItems(ctx.params.id);
			const email = session.guestEmail ?? ctx.context.session?.user.email ?? "";
			const customerName =
				session.shippingAddress?.firstName ??
				ctx.context.session?.user.name ??
				"Customer";

			await ctx.context.events.emit("checkout.completed", {
				sessionId: session.id,
				orderId: session.orderId ?? ctx.body.orderId,
				orderNumber: ctx.body.orderId,
				email,
				customerName,
				items: lineItems.map((item) => ({
					name: item.name,
					quantity: item.quantity,
					price: item.price,
				})),
				subtotal: session.subtotal,
				taxAmount: session.taxAmount,
				shippingAmount: session.shippingAmount,
				discountAmount: session.discountAmount,
				giftCardAmount: session.giftCardAmount,
				total: session.total,
				currency: session.currency,
				shippingAddress: session.shippingAddress,
			});
		}

		return { session };
	},
);
