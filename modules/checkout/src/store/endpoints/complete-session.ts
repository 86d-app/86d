import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	DiscountController,
	GiftCardCheckController,
	InventoryCheckController,
	OrderCreateController,
	PaymentProcessController,
	StoreCreditCheckController,
} from "../../service";

export const completeSession = createStoreEndpoint(
	"/checkout/sessions/:id/complete",
	{
		method: "POST",
		params: z.object({ id: z.string().max(100) }),
		body: z
			.object({
				orderId: z.string().min(1).max(100).optional(),
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

		// Redeem gift card BEFORE creating the order so the balance is debited
		// before the discount is committed to the order record.
		let actualGiftCardAmount = existing.giftCardAmount;
		if (existing.giftCardCode && existing.giftCardAmount > 0) {
			const giftCardController = ctx.context.controllers.giftCards as unknown as
				| GiftCardCheckController
				| undefined;

			if (giftCardController) {
				const redeemResult = await giftCardController.redeem(
					existing.giftCardCode,
					existing.giftCardAmount,
				);

				if (!redeemResult) {
					return {
						error:
							"Gift card could not be redeemed. It may be expired, inactive, or have insufficient balance.",
						status: 422,
					};
				}

				// Use the actual debited amount (may be less if balance was partially
				// used elsewhere between apply and complete)
				actualGiftCardAmount = redeemResult.transaction.amount;
			}
		}

		// Debit store credits BEFORE creating the order so the balance is consumed
		// before the order record is written.
		let actualStoreCreditAmount = existing.storeCreditAmount;
		if (existing.customerId && existing.storeCreditAmount > 0) {
			const storeCreditsController = ctx.context.controllers
				.storeCredits as unknown as StoreCreditCheckController | undefined;

			if (storeCreditsController) {
				try {
					const debitResult = await storeCreditsController.debit({
						customerId: existing.customerId,
						amount: existing.storeCreditAmount,
						reason: "order_payment",
						description: `Store credit applied to checkout ${existing.id}`,
						referenceType: "checkout_session",
						referenceId: existing.id,
					});
					actualStoreCreditAmount = debitResult.amount;
				} catch {
					return {
						error:
							"Store credit could not be applied. Your balance may be insufficient or your account may be frozen.",
						status: 422,
					};
				}
			}
		}

		// Recalculate total if the actual gift card or store credit amounts differ from expected
		const adjustedTotal =
			actualGiftCardAmount !== existing.giftCardAmount ||
			actualStoreCreditAmount !== existing.storeCreditAmount
				? Math.max(
						0,
						existing.subtotal +
							existing.taxAmount +
							existing.shippingAmount -
							existing.discountAmount -
							actualGiftCardAmount -
							actualStoreCreditAmount,
					)
				: existing.total;

		// Create a real order in the orders module if available
		let orderId = ctx.body?.orderId;
		let orderNumber: string | undefined;
		const lineItems = await controller.getLineItems(ctx.params.id);

		const orderController = ctx.context.controllers.order as unknown as
			| OrderCreateController
			| undefined;

		if (orderController) {
			const createdOrder = await orderController.create({
				customerId: existing.customerId,
				guestEmail: existing.guestEmail ?? ctx.context.session?.user.email,
				currency: existing.currency,
				paymentStatus: "paid",
				subtotal: existing.subtotal,
				taxAmount: existing.taxAmount,
				shippingAmount: existing.shippingAmount,
				discountAmount: existing.discountAmount,
				giftCardAmount: actualGiftCardAmount,
				storeCreditAmount: actualStoreCreditAmount,
				total: adjustedTotal,
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
			orderId = createdOrder.id;
			orderNumber = createdOrder.orderNumber;

			// Emit order.placed so listeners (e.g. loyalty) can react
			if (ctx.context.events) {
				await ctx.context.events.emit("order.placed", {
					orderId: createdOrder.id,
					customerId: existing.customerId,
					total: adjustedTotal,
					currency: existing.currency,
				});
			}
		}

		// Increment discount usage now that payment is confirmed and the order exists.
		// This is the canonical point to record redemption — not at apply time (cart
		// abandonment would waste a use) but at completion time when money is collected.
		// applyCode() is best-effort: if the code has since expired or hit its limit,
		// we log the warning but still allow the order through (the amount was already
		// locked in the cart).
		if (existing.discountCode) {
			const discountController = ctx.context.controllers.discount as unknown as
				| DiscountController
				| undefined;

			if (discountController) {
				const result = await discountController.applyCode({
					code: existing.discountCode,
					subtotal: existing.subtotal,
					productIds: lineItems.map((i) => i.productId).filter(Boolean),
				});
				if (!result.valid) {
					// Log but don't block — discount was validated at apply time
					void ctx.context.events?.emit("discount.apply_failed_at_complete", {
						code: existing.discountCode,
						sessionId: existing.id,
						reason: result.error,
					});
				}
			}
		}

		// Deduct inventory (convert reservations made at confirm time into actual stock deductions)
		const inventoryController = ctx.context.controllers.inventory as unknown as
			| InventoryCheckController
			| undefined;

		if (inventoryController?.deduct) {
			for (const item of lineItems) {
				try {
					await inventoryController.deduct({
						productId: item.productId,
						variantId: item.variantId,
						quantity: item.quantity,
					});
				} catch {
					// Inventory deduction is best-effort after order creation.
					// The order is the source of truth; inventory can be reconciled.
				}
			}
		}

		// Fall back to generating an order number if no orders module
		if (!orderId) {
			orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
		}

		const session = await controller.complete(ctx.params.id, orderId);
		if (!session) {
			return { error: "Cannot complete this checkout session", status: 422 };
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
				orderNumber: orderNumber ?? orderId,
				customerId: session.customerId ?? undefined,
				email,
				customerName,
				items: lineItems.map((item) => ({
					name: item.name,
					quantity: item.quantity,
					price: item.price,
					productId: item.productId ?? undefined,
					variantId: item.variantId ?? undefined,
				})),
				subtotal: session.subtotal,
				taxAmount: session.taxAmount,
				shippingAmount: session.shippingAmount,
				discountAmount: session.discountAmount,
				giftCardAmount: actualGiftCardAmount,
				storeCreditAmount: actualStoreCreditAmount,
				total: adjustedTotal,
				currency: session.currency,
				shippingAddress: session.shippingAddress,
			});
		}

		return { session, orderId, orderNumber: orderNumber ?? orderId };
	},
);
