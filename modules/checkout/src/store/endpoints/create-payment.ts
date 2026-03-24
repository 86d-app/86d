import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	PaymentProcessController,
} from "../../service";

export const createPayment = createStoreEndpoint(
	"/checkout/sessions/:id/payment",
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

		// Cannot create payment for completed/expired sessions
		if (existing.status === "completed" || existing.status === "expired") {
			return { error: "Cannot process payment for this session", status: 422 };
		}

		// If total is zero (fully covered by gift card/discount), skip payment
		if (existing.total === 0) {
			const updated = await controller.setPaymentIntent(
				ctx.params.id,
				"no_payment_required",
				"succeeded",
			);
			return {
				payment: {
					id: "no_payment_required",
					status: "succeeded",
					amount: 0,
					currency: existing.currency,
				},
				session: updated,
			};
		}

		// If a payment intent already exists, return it
		if (
			existing.paymentIntentId &&
			existing.paymentIntentId !== "no_payment_required"
		) {
			const paymentController = ctx.context.controllers.payments as unknown as
				| PaymentProcessController
				| undefined;

			if (paymentController) {
				const intent = await paymentController.getIntent(
					existing.paymentIntentId,
				);
				if (intent) {
					const secret =
						(intent.providerMetadata?.clientSecret as string) ?? undefined;
					return {
						payment: {
							id: intent.id,
							status: intent.status,
							amount: intent.amount,
							currency: intent.currency,
							...(secret ? { clientSecret: secret } : {}),
						},
						session: existing,
					};
				}
			}
		}

		// Create payment intent via payments module
		const paymentController = ctx.context.controllers.payments as unknown as
			| PaymentProcessController
			| undefined;

		if (!paymentController) {
			// No payments module installed — auto-succeed (demo mode)
			const updated = await controller.setPaymentIntent(
				ctx.params.id,
				`demo_${crypto.randomUUID()}`,
				"succeeded",
			);
			return {
				payment: {
					id: updated?.paymentIntentId ?? "demo",
					status: "succeeded",
					amount: existing.total,
					currency: existing.currency,
				},
				session: updated,
			};
		}

		// Create the intent through the payments module
		const email = existing.guestEmail ?? ctx.context.session?.user.email;
		const intent = await paymentController.createIntent({
			amount: existing.total,
			currency: existing.currency,
			customerId: existing.customerId,
			email: email ?? undefined,
			checkoutSessionId: ctx.params.id,
			metadata: { cartId: existing.cartId },
		});

		// Extract clientSecret from providerMetadata (set by Stripe/other providers)
		const clientSecret =
			(intent.providerMetadata?.clientSecret as string) ?? undefined;

		// If the provider returned a clientSecret, the frontend will handle
		// confirmation via provider-specific UI (e.g. Stripe PaymentElement).
		// Do NOT auto-confirm — store the intent with its initial status.
		if (clientSecret) {
			const updated = await controller.setPaymentIntent(
				ctx.params.id,
				intent.id,
				intent.status,
			);
			return {
				payment: {
					id: intent.id,
					status: intent.status,
					amount: intent.amount,
					currency: intent.currency,
					clientSecret,
				},
				session: updated,
			};
		}

		// PayPal: requires customer approval via PayPal buttons before capture.
		// Return the PayPal order ID so the frontend can render PayPal buttons.
		const paymentType = intent.providerMetadata?.paymentType as
			| string
			| undefined;
		if (paymentType === "paypal") {
			const updated = await controller.setPaymentIntent(
				ctx.params.id,
				intent.id,
				intent.status,
			);
			return {
				payment: {
					id: intent.id,
					status: intent.status,
					amount: intent.amount,
					currency: intent.currency,
					paypalOrderId: intent.providerMetadata?.paypalOrderId as string,
				},
				session: updated,
			};
		}

		// No clientSecret and no provider-specific flow — auto-confirm
		const confirmed = await paymentController.confirmIntent(intent.id);
		const finalStatus = confirmed?.status ?? intent.status;

		// Store the intent on the checkout session
		const updated = await controller.setPaymentIntent(
			ctx.params.id,
			intent.id,
			finalStatus,
		);

		return {
			payment: {
				id: intent.id,
				status: finalStatus,
				amount: intent.amount,
				currency: intent.currency,
			},
			session: updated,
		};
	},
);
