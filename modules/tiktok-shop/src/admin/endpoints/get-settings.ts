import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	appKey?: string | undefined;
	appSecret?: string | undefined;
	accessToken?: string | undefined;
	shopId?: string | undefined;
	sandbox?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/tiktok-shop/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.appKey && options.appSecret && options.accessToken,
			);
			return {
				configured: hasCredentials,
				shopId: options.shopId ?? null,
				sandbox: options.sandbox ?? true,
				appKey: options.appKey ? `${options.appKey.slice(0, 8)}...` : null,
			};
		},
	);
}
