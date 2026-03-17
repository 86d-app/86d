import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	apiKey?: string | undefined;
	shopId?: string | undefined;
	accessToken?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/etsy/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.apiKey && options.shopId && options.accessToken,
			);
			return {
				configured: hasCredentials,
				shopId: options.shopId ?? null,
				apiKey: options.apiKey ? `${options.apiKey.slice(0, 8)}...` : null,
			};
		},
	);
}
