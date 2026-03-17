import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	taxjarApiKey?: string | undefined;
	taxjarSandbox?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/tax/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(options.taxjarApiKey);
			return {
				configured: hasCredentials,
				sandbox: options.taxjarSandbox ?? false,
				apiKey: options.taxjarApiKey
					? `${options.taxjarApiKey.slice(0, 8)}...`
					: null,
			};
		},
	);
}
