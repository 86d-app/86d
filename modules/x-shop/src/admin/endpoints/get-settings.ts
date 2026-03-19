import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	apiKey?: string | undefined;
	apiSecret?: string | undefined;
	accessToken?: string | undefined;
	merchantId?: string | undefined;
}

export function resolveSettings(options: SettingsOptions) {
	const hasCredentials = Boolean(
		options.apiKey && options.apiSecret && options.accessToken,
	);
	return {
		configured: hasCredentials,
		merchantId: options.merchantId ?? null,
		apiKey: options.apiKey ? `${options.apiKey.slice(0, 8)}...` : null,
	};
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/x-shop/settings",
		{ method: "GET" },
		async () => resolveSettings(options),
	);
}
