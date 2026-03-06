import type { Module, ModuleConfig } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { createStoreEndpoints } from "./store/endpoints";

export { PayPalPaymentProvider } from "./provider";

export interface PayPalOptions extends ModuleConfig {
	clientId: string;
	clientSecret: string;
	sandbox?: string | undefined;
	webhookId?: string | undefined;
}

export default function paypal(options: PayPalOptions): Module {
	const webhookOpts = {
		clientId: options.clientId,
		clientSecret: options.clientSecret,
		...(options.webhookId != null && { webhookId: options.webhookId }),
		...(options.sandbox != null && { sandbox: options.sandbox }),
	};

	return {
		id: "paypal",
		version: "0.0.1",
		schema: {},
		init: async () => {
			return {};
		},
		endpoints: {
			store: createStoreEndpoints(webhookOpts),
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/paypal",
					component: "PayPalAdmin",
					label: "PayPal",
					icon: "CreditCard",
					group: "Settings",
				},
			],
		},
		options: {
			clientId: options.clientId,
			clientSecret: options.clientSecret,
			sandbox: options.sandbox ?? "",
			webhookId: options.webhookId ?? "",
		},
	};
}
