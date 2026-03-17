import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	clientId?: string | undefined;
	clientSecret?: string | undefined;
	customerId?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/uber-direct/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.clientId && options.clientSecret && options.customerId,
			);
			return {
				configured: hasCredentials,
				clientId: options.clientId
					? `${options.clientId.slice(0, 8)}...`
					: null,
				customerId: options.customerId
					? `${options.customerId.slice(0, 8)}...`
					: null,
			};
		},
	);
}
