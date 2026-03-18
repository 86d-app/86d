import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	clientId?: string | undefined;
	clientSecret?: string | undefined;
	channelType?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/walmart/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(options.clientId && options.clientSecret);
			return {
				configured: hasCredentials,
				channelType: options.channelType ?? null,
				clientId: options.clientId
					? `${options.clientId.slice(0, 12)}...`
					: null,
			};
		},
	);
}
