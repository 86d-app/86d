import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	gtmContainerId?: string | undefined;
	sentryDsn?: string | undefined;
	ga4MeasurementId?: string | undefined;
	ga4Configured?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/analytics/settings",
		{ method: "GET" },
		async () => {
			const gtmConfigured = Boolean(options.gtmContainerId);
			const sentryConfigured = Boolean(options.sentryDsn);
			const ga4Configured = Boolean(options.ga4Configured);
			return {
				gtm: {
					configured: gtmConfigured,
					provider: "google-tag-manager",
					containerId: options.gtmContainerId ?? null,
				},
				ga4: {
					configured: ga4Configured,
					provider: "ga4-measurement-protocol",
					measurementId: options.ga4MeasurementId ?? null,
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
