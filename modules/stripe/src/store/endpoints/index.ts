import { createStripeWebhook } from "./webhook";

export function createStoreEndpoints(opts?: { webhookSecret?: string }) {
	return {
		"/stripe/webhook": createStripeWebhook({
			webhookSecret: opts?.webhookSecret,
		}),
	};
}
