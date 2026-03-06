import { createAdminEndpoint } from "@86d-app/core";

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
}

function str(val: unknown): string {
	return typeof val === "string" ? val : "";
}

export const getSettings = createAdminEndpoint(
	"/admin/stripe/settings",
	{ method: "GET" },
	async (ctx) => {
		// Module options are flat key-value pairs at runtime
		const opts = ctx.context.options as Record<string, unknown>;
		const apiKey = str(opts.apiKey);
		const webhookSecret = str(opts.webhookSecret);

		return {
			configured: apiKey.length > 0,
			apiKeyMasked: apiKey ? maskKey(apiKey) : null,
			apiKeyMode: apiKey.startsWith("sk_live_")
				? "live"
				: apiKey.startsWith("sk_test_")
					? "test"
					: "unknown",
			webhookSecretConfigured: webhookSecret.length > 0,
			webhookSecretMasked: webhookSecret ? maskKey(webhookSecret) : null,
		};
	},
);
