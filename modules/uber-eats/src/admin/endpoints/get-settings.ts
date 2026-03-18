import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	clientId?: string | undefined;
	clientSecret?: string | undefined;
	restaurantId?: string | undefined;
}

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/uber-eats/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.clientId && options.clientSecret && options.restaurantId,
			);
			return {
				configured: hasCredentials,
				clientIdMasked: options.clientId ? maskKey(options.clientId) : null,
				clientSecretMasked: options.clientSecret
					? maskKey(options.clientSecret)
					: null,
				restaurantIdMasked: options.restaurantId
					? maskKey(options.restaurantId)
					: null,
				webhookUrl: "/api/uber-eats/webhook",
			};
		},
	);
}
