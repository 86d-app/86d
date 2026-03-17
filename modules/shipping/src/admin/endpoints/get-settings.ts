import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	easypostApiKey?: string | undefined;
	easypostTestMode?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/shipping/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(options.easypostApiKey);
			return {
				configured: hasCredentials,
				testMode: options.easypostTestMode ?? true,
				apiKey: options.easypostApiKey
					? `${options.easypostApiKey.slice(0, 12)}...`
					: null,
			};
		},
	);
}
