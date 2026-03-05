import { createSquareWebhook } from "./webhook";

export function createStoreEndpoints(opts?: {
	webhookSignatureKey?: string;
	webhookNotificationUrl?: string;
}) {
	return {
		"/square/webhook": createSquareWebhook({
			webhookSignatureKey: opts?.webhookSignatureKey,
			notificationUrl: opts?.webhookNotificationUrl ?? "",
		}),
	};
}
