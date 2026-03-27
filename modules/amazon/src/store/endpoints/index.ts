import { createAmazonWebhook } from "./webhooks";

export { createAmazonWebhook };

export function createStoreEndpoints(webhookSecret?: string | undefined) {
	return {
		"/amazon/webhooks": createAmazonWebhook(webhookSecret),
	};
}

export const storeEndpoints = createStoreEndpoints();
