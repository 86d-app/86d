import { createAdminEndpoint } from "@86d-app/core";

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
}

function str(val: unknown): string {
	return typeof val === "string" ? val : "";
}

export const getSettings = createAdminEndpoint(
	"/admin/paypal/settings",
	{ method: "GET" },
	async (ctx) => {
		// Module options are flat key-value pairs at runtime
		const opts = ctx.context.options as Record<string, unknown>;
		const clientId = str(opts.clientId);
		const clientSecret = str(opts.clientSecret);
		const sandbox = str(opts.sandbox);
		const webhookId = str(opts.webhookId);

		return {
			configured: clientId.length > 0 && clientSecret.length > 0,
			clientIdMasked: clientId ? maskKey(clientId) : null,
			clientSecretMasked: clientSecret ? maskKey(clientSecret) : null,
			mode:
				sandbox === "true" || sandbox === "1"
					? ("sandbox" as const)
					: ("live" as const),
			webhookIdConfigured: webhookId.length > 0,
			webhookIdMasked: webhookId ? maskKey(webhookId) : null,
		};
	},
);
