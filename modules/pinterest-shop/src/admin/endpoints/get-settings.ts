import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	accessToken?: string | undefined;
	adAccountId?: string | undefined;
	catalogId?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/pinterest-shop/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(options.accessToken);
			return {
				configured: hasCredentials,
				adAccountId: options.adAccountId ?? null,
				catalogId: options.catalogId ?? null,
				accessToken: options.accessToken
					? `${options.accessToken.slice(0, 8)}...`
					: null,
			};
		},
	);
}
