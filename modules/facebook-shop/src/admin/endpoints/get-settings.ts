import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	accessToken?: string | undefined;
	pageId?: string | undefined;
	catalogId?: string | undefined;
	commerceAccountId?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/facebook-shop/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.accessToken && options.pageId && options.catalogId,
			);
			return {
				configured: hasCredentials,
				pageId: options.pageId ?? null,
				catalogId: options.catalogId ?? null,
				commerceAccountId: options.commerceAccountId ?? null,
				accessToken: options.accessToken
					? `${options.accessToken.slice(0, 8)}...`
					: null,
			};
		},
	);
}
