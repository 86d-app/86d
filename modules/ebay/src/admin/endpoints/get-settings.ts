import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	clientId?: string | undefined;
	clientSecret?: string | undefined;
	refreshToken?: string | undefined;
	siteId?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/ebay/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.clientId && options.clientSecret && options.refreshToken,
			);
			return {
				configured: hasCredentials,
				siteId: options.siteId ?? "EBAY_US",
				clientId: options.clientId
					? `${options.clientId.slice(0, 12)}...`
					: null,
			};
		},
	);
}
