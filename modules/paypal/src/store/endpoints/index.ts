import { createPayPalWebhook } from "./webhook";

export function createStoreEndpoints(opts: {
	clientId: string;
	clientSecret: string;
	webhookId?: string;
	sandbox?: string;
}) {
	return {
		"/paypal/webhook": createPayPalWebhook({
			clientId: opts.clientId,
			clientSecret: opts.clientSecret,
			webhookId: opts.webhookId,
			sandbox: opts.sandbox,
		}),
	};
}
