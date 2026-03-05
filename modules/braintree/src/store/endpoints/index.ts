import { createBraintreeWebhook } from "./webhook";

export function createStoreEndpoints(opts: {
	publicKey: string;
	privateKey: string;
}) {
	return {
		"/braintree/webhook": createBraintreeWebhook({
			publicKey: opts.publicKey,
			privateKey: opts.privateKey,
		}),
	};
}
