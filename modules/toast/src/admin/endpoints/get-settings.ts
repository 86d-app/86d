import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	apiKey?: string | undefined;
	restaurantGuid?: string | undefined;
	sandbox?: boolean | undefined;
}

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/toast/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(options.apiKey && options.restaurantGuid);
			return {
				configured: hasCredentials,
				sandbox: options.sandbox ?? true,
				apiKeyMasked: options.apiKey ? maskKey(options.apiKey) : null,
				restaurantGuidMasked: options.restaurantGuid
					? maskKey(options.restaurantGuid)
					: null,
			};
		},
	);
}
