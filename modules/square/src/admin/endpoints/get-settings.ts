import { createAdminEndpoint } from "@86d-app/core";

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
}

function str(val: unknown): string {
	return typeof val === "string" ? val : "";
}

export const getSettings = createAdminEndpoint(
	"/admin/square/settings",
	{ method: "GET" },
	async (ctx) => {
		// Module options are flat key-value pairs at runtime
		const opts = ctx.context.options as Record<string, unknown>;
		const accessToken = str(opts.accessToken);
		const webhookSignatureKey = str(opts.webhookSignatureKey);
		const webhookNotificationUrl = str(opts.webhookNotificationUrl);

		return {
			configured: accessToken.length > 0,
			accessTokenMasked: accessToken ? maskKey(accessToken) : null,
			webhookSignatureConfigured: webhookSignatureKey.length > 0,
			webhookSignatureKeyMasked: webhookSignatureKey
				? maskKey(webhookSignatureKey)
				: null,
			webhookNotificationUrl: webhookNotificationUrl || null,
		};
	},
);
