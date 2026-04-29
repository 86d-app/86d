import type { Module, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { paymentsSchema } from "./schema";
import type { PaymentProvider } from "./service";
import { createPaymentController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	PaymentController,
	PaymentIntent,
	PaymentIntentStatus,
	PaymentMethod,
	PaymentProvider,
	ProviderIntentResult,
	ProviderRefundResult,
	Refund,
	RefundStatus,
} from "./service";

export interface PaymentsOptions {
	/** Default currency for payment intents */
	currency?: string;
	/** Payment provider implementation (e.g. StripePaymentProvider) */
	provider?: PaymentProvider;
}

export default function payments(options?: PaymentsOptions): Module {
	return {
		id: "payments",
		version: "0.0.1",
		schema: paymentsSchema,
		exports: {
			read: ["paymentStatus", "paymentAmount", "paymentMethod"],
		},
		events: {
			emits: ["payment.completed", "payment.failed", "payment.refunded"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createPaymentController(ctx.data, options?.provider);
			return { controllers: { payments: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		store: {
			pages: [
				{ path: "/account/payment-methods", component: "SavedPaymentMethods" },
			],
		},
		admin: {
			pages: [
				{
					path: "/admin/payments",
					component: "PaymentsAdmin",
					label: "Payments",
					icon: "CreditCard",
					group: "Sales",
				},
			],
		},
	};
}
