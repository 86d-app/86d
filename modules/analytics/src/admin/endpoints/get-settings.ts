import { createAdminEndpoint } from "@86d-app/core";
import { GA4Provider } from "../../providers/ga4";

type ConnectionStatus = "connected" | "not_configured" | "error";

interface SettingsOptions {
	gtmContainerId?: string | undefined;
	sentryDsn?: string | undefined;
	ga4MeasurementId?: string | undefined;
	ga4ApiSecret?: string | undefined;
}

/**
 * A Sentry DSN looks like:
 *   https://<publicKey>@<host>/<projectId>
 * If the DSN parses to that shape, it is structurally valid. We stop short of
 * actually POSTing to the envelope endpoint because Sentry would count it as
 * an ingested event.
 */
function checkSentryDsn(
	dsn: string,
):
	| { ok: true; host: string; projectId: string }
	| { ok: false; error: string } {
	let parsed: URL;
	try {
		parsed = new URL(dsn);
	} catch {
		return { ok: false, error: "DSN is not a valid URL" };
	}
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		return { ok: false, error: "DSN must use http(s)" };
	}
	if (!parsed.username) {
		return { ok: false, error: "DSN is missing the public key" };
	}
	const projectId = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
	if (!projectId || !/^\d+$/.test(projectId)) {
		return { ok: false, error: "DSN is missing a numeric project id" };
	}
	return { ok: true, host: parsed.host, projectId };
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/analytics/settings",
		{ method: "GET" },
		async () => {
			const gtmConfigured = Boolean(options.gtmContainerId);

			const sentryDsn = options.sentryDsn ?? "";
			let sentryStatus: ConnectionStatus = "not_configured";
			let sentryError: string | undefined;
			let sentryHost: string | null = null;
			if (sentryDsn.length > 0) {
				const result = checkSentryDsn(sentryDsn);
				if (result.ok) {
					sentryStatus = "connected";
					sentryHost = result.host;
				} else {
					sentryStatus = "error";
					sentryError = result.error;
				}
			}

			const ga4Configured = Boolean(
				options.ga4MeasurementId && options.ga4ApiSecret,
			);
			let ga4Status: ConnectionStatus = "not_configured";
			let ga4Error: string | undefined;
			if (ga4Configured && options.ga4MeasurementId && options.ga4ApiSecret) {
				const provider = new GA4Provider(
					options.ga4MeasurementId,
					options.ga4ApiSecret,
				);
				const result = await provider.verifyConnection();
				if (result.ok) {
					ga4Status = "connected";
				} else {
					ga4Status = "error";
					ga4Error = result.error;
				}
			}

			return {
				gtm: {
					configured: gtmConfigured,
					provider: "google-tag-manager",
					containerId: options.gtmContainerId ?? null,
				},
				ga4: {
					status: ga4Status,
					error: ga4Error,
					configured: ga4Configured,
					provider: "ga4-measurement-protocol",
					measurementId: options.ga4MeasurementId ?? null,
				},
				sentry: {
					status: sentryStatus,
					error: sentryError,
					configured: sentryStatus === "connected",
					provider: "sentry",
					dsn: sentryDsn ? `${sentryDsn.slice(0, 20)}...` : null,
					host: sentryHost,
				},
			};
		},
	);
}
