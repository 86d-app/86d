import type { Module, ModuleConfig } from "@86d-app/core";
import { createStoreEndpoints } from "./store/endpoints";

export { StripePaymentProvider } from "./provider";

export interface StripeOptions extends ModuleConfig {
	/** Stripe secret API key (sk_live_... or sk_test_...) */
	apiKey: string;
	/** Stripe webhook signing secret for signature verification */
	webhookSecret?: string | undefined;
}

export default function stripe(options: StripeOptions): Module {
	return {
		id: "stripe",
		version: "0.0.1",
		schema: {},
		init: async () => {
			return {};
		},
		endpoints: {
			store: createStoreEndpoints(
				options.webhookSecret != null
					? { webhookSecret: options.webhookSecret }
					: {},
			),
			admin: {},
		},
		options: {
			apiKey: options.apiKey,
			webhookSecret: options.webhookSecret ?? "",
		},
	};
}
