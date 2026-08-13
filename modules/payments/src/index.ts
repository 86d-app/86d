import type {
	Module,
	ModuleContext,
	PaymentConnectionProvider,
} from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import {
	createPaymentCheckoutProvider,
	createPaymentIntentProvider,
} from "./capabilities";
import { createPaymentConnectionController } from "./connection-service";
import { paymentsSchema } from "./schema";
import type { PaymentProvider } from "./service";
import { createPaymentController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	PaymentConnectionCapability,
	PaymentConnectionMode,
	PaymentConnectionProvider,
	PaymentOperationPayload,
	PaymentProviderOperationOutcome,
	PaymentProviderOperationRequest,
	PaymentProviderReconciliationRequest,
} from "@86d-app/core";
export type {
	CreatePaymentConnectionInput,
	PaymentConnection,
	PaymentConnectionController,
	PaymentConnectionErrorCode,
	PaymentConnectionHealth,
	PaymentConnectionLifecycle,
	PaymentOperation,
	PaymentOperationAttempt,
	PaymentOperationExecutionInput,
} from "./connection-service";
export { PaymentConnectionError } from "./connection-service";
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
	/**
	 * Explicit v2 adapters, each bound to one immutable Payment Connection ID.
	 * These are not used by the legacy Checkout capability or shopper routes.
	 */
	connectionProviders?: readonly PaymentConnectionProvider[];
}

export default function payments(options?: PaymentsOptions): Module {
	return {
		id: "payments",
		version: "0.0.1",
		schema: paymentsSchema,
		capabilities: {
			provides: [
				createPaymentCheckoutProvider(options?.provider),
				createPaymentIntentProvider(options?.provider),
			],
		},
		exports: {
			read: ["paymentStatus", "paymentAmount", "paymentMethod"],
		},
		events: {
			emits: ["payment.completed", "payment.failed", "payment.refunded"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createPaymentController(ctx.data, options?.provider);
			const connections = createPaymentConnectionController(
				ctx.data,
				ctx.transactions,
				options?.connectionProviders,
			);
			return {
				controllers: {
					payments: controller,
					paymentConnections: connections,
				},
			};
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
