import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	merchantId?: string | undefined;
	apiKey?: string | undefined;
	targetCountry?: string | undefined;
	contentLanguage?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/google-shopping/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(options.merchantId && options.apiKey);
			return {
				configured: hasCredentials,
				merchantId: options.merchantId ?? null,
				targetCountry: options.targetCountry ?? "US",
				contentLanguage: options.contentLanguage ?? "en",
				apiKey: options.apiKey ? `${options.apiKey.slice(0, 8)}...` : null,
			};
		},
	);
}
