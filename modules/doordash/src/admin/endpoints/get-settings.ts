import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	developerId?: string | undefined;
	keyId?: string | undefined;
	signingSecret?: string | undefined;
	sandbox?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/doordash/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.developerId && options.keyId && options.signingSecret,
			);
			return {
				configured: hasCredentials,
				sandbox: options.sandbox ?? true,
				developerId: options.developerId
					? `${options.developerId.slice(0, 8)}...`
					: null,
				keyId: options.keyId ? `${options.keyId.slice(0, 8)}...` : null,
			};
		},
	);
}
