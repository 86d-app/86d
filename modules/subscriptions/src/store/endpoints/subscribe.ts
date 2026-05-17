import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	PaymentProcessController,
	SubscriptionController,
} from "../../service";

export const subscribe = createStoreEndpoint(
	"/subscriptions/subscribe",
	{
		method: "POST",
		body: z.object({
			planId: z.string().max(200),
			// Required when subscribing to a paid plan without a trial period.
			// The payment intent must already be in "succeeded" state.
			paymentIntentId: z.string().max(200).optional(),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const plan = await controller.getPlan(ctx.body.planId);
		if (!plan) return { error: "Plan not found", status: 404 };
		if (!plan.isActive) return { error: "Plan is not active", status: 400 };

		// Plans with a price and no trial period require a completed payment.
		const hasTrial = plan.trialDays !== undefined && plan.trialDays > 0;
		const requiresPayment = plan.price > 0 && !hasTrial;

		if (requiresPayment) {
			if (!ctx.body.paymentIntentId) {
				return {
					error:
						"A completed payment intent is required to subscribe to this plan",
					status: 400,
				};
			}

			const paymentController = ctx.context.controllers.payments as unknown as
				| PaymentProcessController
				| undefined;

			if (paymentController) {
				const intent = await paymentController.getIntent(
					ctx.body.paymentIntentId,
				);
				if (!intent) {
					return { error: "Payment intent not found", status: 404 };
				}
				if (intent.status !== "succeeded") {
					return {
						error: `Payment has not been completed (status: ${intent.status})`,
						status: 422,
					};
				}
			}
		}

		const subscription = await controller.subscribe({
			planId: ctx.body.planId,
			email: session.user.email,
			customerId: session.user.id,
			...(ctx.body.paymentIntentId
				? { paymentIntentId: ctx.body.paymentIntentId }
				: {}),
		});
		void ctx.context.events?.emit("subscription.created", {
			subscriptionId: subscription.id,
			planId: subscription.planId,
			customerId: subscription.customerId,
			email: subscription.email,
		});
		return { subscription };
	},
);
