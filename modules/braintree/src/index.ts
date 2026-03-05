import type { Module, ModuleConfig } from "@86d-app/core";
import { createStoreEndpoints } from "./store/endpoints";

export { BraintreePaymentProvider } from "./provider";

export interface BraintreeOptions extends ModuleConfig {
	merchantId: string;
	publicKey: string;
	privateKey: string;
	sandbox?: string | undefined;
}

export default function braintree(options: BraintreeOptions): Module {
	return {
		id: "braintree",
		version: "0.0.1",
		schema: {},
		init: async () => {
			return {};
		},
		endpoints: {
			store: createStoreEndpoints({
				publicKey: options.publicKey,
				privateKey: options.privateKey,
			}),
			admin: {},
		},
		options: {
			merchantId: options.merchantId,
			publicKey: options.publicKey,
			privateKey: options.privateKey,
			sandbox: options.sandbox ?? "",
		},
	};
}
