import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	gtmContainerId?: string | undefined;
	sentryDsn?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/analytics/settings",
		{ method: "GET" },
		async () => {
			const gtmConfigured = Boolean(options.gtmContainerId);
			const sentryConfigured = Boolean(options.sentryDsn);
			return {
				gtm: {
					configured: gtmConfigured,
					provider: "google-tag-manager",
					containerId: options.gtmContainerId ?? null,
				},
				sentry: {
					configured: sentryConfigured,
					provider: "sentry",
					dsn: options.sentryDsn
						? `${options.sentryDsn.slice(0, 20)}...`
						: null,
				},
			};
		},
	);
}
