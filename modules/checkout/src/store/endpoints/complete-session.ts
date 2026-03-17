import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	GiftCardCheckController,
	OrderCreateController,
	PaymentProcessController,
} from "../../service";

export const completeSession = createStoreEndpoint(
	"/checkout/sessions/:id/complete",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z
			.object({
				orderId: z.string().min(1).optional(),
			})
			.optional(),
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

		// Create a real order in the orders module if available
		let orderId = ctx.body?.orderId;
		const lineItems = await controller.getLineItems(ctx.params.id);

		const orderController = ctx.context.controllers.orders as unknown as
			| OrderCreateController
			| undefined;

		if (orderController) {
			const order = await orderController.create({
				customerId: existing.customerId,
				guestEmail: existing.guestEmail ?? ctx.context.session?.user.email,
				currency: existing.currency,
				subtotal: existing.subtotal,
				taxAmount: existing.taxAmount,
				shippingAmount: existing.shippingAmount,
				discountAmount: existing.discountAmount,
				total: existing.total,
				metadata: {
					checkoutSessionId: existing.id,
					paymentIntentId: existing.paymentIntentId,
				},
				items: lineItems.map((item) => ({
					productId: item.productId,
					variantId: item.variantId,
					name: item.name,
					sku: item.sku,
					price: item.price,
					quantity: item.quantity,
				})),
				shippingAddress: existing.shippingAddress
					? {
							firstName: existing.shippingAddress.firstName,
							lastName: existing.shippingAddress.lastName,
							company: existing.shippingAddress.company,
							line1: existing.shippingAddress.line1,
							line2: existing.shippingAddress.line2,
							city: existing.shippingAddress.city,
							state: existing.shippingAddress.state,
							postalCode: existing.shippingAddress.postalCode,
							country: existing.shippingAddress.country,
							phone: existing.shippingAddress.phone,
						}
					: undefined,
				billingAddress: existing.billingAddress
					? {
							firstName: existing.billingAddress.firstName,
							lastName: existing.billingAddress.lastName,
							company: existing.billingAddress.company,
							line1: existing.billingAddress.line1,
							line2: existing.billingAddress.line2,
							city: existing.billingAddress.city,
							state: existing.billingAddress.state,
							postalCode: existing.billingAddress.postalCode,
							country: existing.billingAddress.country,
							phone: existing.billingAddress.phone,
						}
					: undefined,
			});
			orderId = order.id;
		}

		// Fall back to generating an order number if no orders module
		if (!orderId) {
			orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
		}

		const session = await controller.complete(ctx.params.id, orderId);
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
					orderId,
				);
			}
		}

		// Emit checkout.completed event for email notifications
		if (ctx.context.events) {
			const email = session.guestEmail ?? ctx.context.session?.user.email ?? "";
			const customerName =
				session.shippingAddress?.firstName ??
				ctx.context.session?.user.name ??
				"Customer";

			await ctx.context.events.emit("checkout.completed", {
				sessionId: session.id,
				orderId,
				orderNumber: orderId,
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

		return { session, orderId };
	},
);
