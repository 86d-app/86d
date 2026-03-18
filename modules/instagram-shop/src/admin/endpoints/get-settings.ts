import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	accessToken?: string | undefined;
	businessId?: string | undefined;
	catalogId?: string | undefined;
	commerceAccountId?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/instagram-shop/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.accessToken && options.businessId && options.catalogId,
			);
			return {
				configured: hasCredentials,
				businessId: options.businessId ?? null,
				catalogId: options.catalogId ?? null,
				commerceAccountId: options.commerceAccountId ?? null,
				accessToken: options.accessToken
					? `${options.accessToken.slice(0, 8)}...`
					: null,
			};
		},
	);
}
