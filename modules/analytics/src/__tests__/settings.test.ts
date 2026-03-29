import { describe, expect, it } from "vitest";

/**
 * Tests for the analytics settings logic.
 *
 * Verifies correct configuration status reporting for GTM and Sentry
 * providers across all configuration combinations.
 */

interface SettingsOptions {
	gtmContainerId?: string | undefined;
	sentryDsn?: string | undefined;
	ga4MeasurementId?: string | undefined;
	ga4Configured?: boolean | undefined;
}

/** Mirrors the logic inside createGetSettingsEndpoint without the HTTP wrapper. */
function getSettings(options: SettingsOptions) {
	const gtmConfigured = Boolean(options.gtmContainerId);
	const sentryConfigured = Boolean(options.sentryDsn);
	const ga4Configured = Boolean(options.ga4Configured);
	return {
		gtm: {
			configured: gtmConfigured,
			provider: "google-tag-manager" as const,
			containerId: options.gtmContainerId ?? null,
		},
		ga4: {
			configured: ga4Configured,
			provider: "ga4-measurement-protocol" as const,
			measurementId: options.ga4MeasurementId ?? null,
		},
		sentry: {
			configured: sentryConfigured,
			provider: "sentry" as const,
			dsn: options.sentryDsn ? `${options.sentryDsn.slice(0, 20)}...` : null,
		},
	};
}

describe("analytics — settings", () => {
	describe("GTM configuration status", () => {
		it("reports GTM as configured when containerId is provided", () => {
			const result = getSettings({ gtmContainerId: "GTM-XXXXXXX" });
			expect(result.gtm.configured).toBe(true);
			expect(result.gtm.containerId).toBe("GTM-XXXXXXX");
			expect(result.gtm.provider).toBe("google-tag-manager");
		});

		it("reports GTM as not configured when containerId is missing", () => {
			const result = getSettings({});
			expect(result.gtm.configured).toBe(false);
			expect(result.gtm.containerId).toBeNull();
		});

		it("reports GTM as not configured when containerId is empty string", () => {
			const result = getSettings({ gtmContainerId: "" });
			expect(result.gtm.configured).toBe(false);
		});

		it("reports GTM as not configured when containerId is undefined", () => {
			const result = getSettings({ gtmContainerId: undefined });
			expect(result.gtm.configured).toBe(false);
			expect(result.gtm.containerId).toBeNull();
		});
	});

	describe("Sentry configuration status", () => {
		it("reports Sentry as configured when DSN is provided", () => {
			const dsn = "https://abc123@o123.ingest.sentry.io/456";
			const result = getSettings({ sentryDsn: dsn });
			expect(result.sentry.configured).toBe(true);
			expect(result.sentry.provider).toBe("sentry");
		});

		it("truncates the Sentry DSN for display", () => {
			const dsn = "https://abc123@o123.ingest.sentry.io/456";
			const result = getSettings({ sentryDsn: dsn });
			expect(result.sentry.dsn).toBe(`${dsn.slice(0, 20)}...`);
			expect(result.sentry.dsn).not.toBe(dsn);
		});

		it("reports Sentry as not configured when DSN is missing", () => {
			const result = getSettings({});
			expect(result.sentry.configured).toBe(false);
			expect(result.sentry.dsn).toBeNull();
		});

		it("reports Sentry as not configured when DSN is empty string", () => {
			const result = getSettings({ sentryDsn: "" });
			expect(result.sentry.configured).toBe(false);
		});

		it("reports Sentry as not configured when DSN is undefined", () => {
			const result = getSettings({ sentryDsn: undefined });
			expect(result.sentry.configured).toBe(false);
			expect(result.sentry.dsn).toBeNull();
		});
	});

	describe("GA4 Measurement Protocol configuration status", () => {
		it("reports GA4 as configured when ga4Configured is true", () => {
			const result = getSettings({
				ga4MeasurementId: "G-TEST123",
				ga4Configured: true,
			});
			expect(result.ga4.configured).toBe(true);
			expect(result.ga4.measurementId).toBe("G-TEST123");
			expect(result.ga4.provider).toBe("ga4-measurement-protocol");
		});

		it("reports GA4 as not configured when ga4Configured is false", () => {
			const result = getSettings({
				ga4MeasurementId: "G-TEST123",
				ga4Configured: false,
			});
			expect(result.ga4.configured).toBe(false);
		});

		it("reports GA4 as not configured when options are missing", () => {
			const result = getSettings({});
			expect(result.ga4.configured).toBe(false);
			expect(result.ga4.measurementId).toBeNull();
		});
	});

	describe("combined configuration", () => {
		it("reports all providers as configured when all are provided", () => {
			const result = getSettings({
				gtmContainerId: "GTM-ABC123",
				sentryDsn: "https://key@sentry.io/123",
				ga4MeasurementId: "G-TEST123",
				ga4Configured: true,
			});
			expect(result.gtm.configured).toBe(true);
			expect(result.sentry.configured).toBe(true);
			expect(result.ga4.configured).toBe(true);
		});

		it("reports no providers as configured when all are missing", () => {
			const result = getSettings({});
			expect(result.gtm.configured).toBe(false);
			expect(result.sentry.configured).toBe(false);
			expect(result.ga4.configured).toBe(false);
		});

		it("reports only GTM when only GTM is provided", () => {
			const result = getSettings({ gtmContainerId: "GTM-XYZ" });
			expect(result.gtm.configured).toBe(true);
			expect(result.sentry.configured).toBe(false);
			expect(result.ga4.configured).toBe(false);
		});

		it("reports only Sentry when only Sentry is provided", () => {
			const result = getSettings({
				sentryDsn: "https://key@sentry.io/123",
			});
			expect(result.gtm.configured).toBe(false);
			expect(result.sentry.configured).toBe(true);
			expect(result.ga4.configured).toBe(false);
		});
	});
});

describe("analytics — module factory settings wiring", () => {
	it("settings endpoint is included when GTM is configured", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({ gtmContainerId: "GTM-TEST" });
		expect(mod.endpoints?.admin).toHaveProperty("/admin/analytics/settings");
	});

	it("settings endpoint is included when Sentry is configured", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({ sentryDsn: "https://key@sentry.io/1" });
		expect(mod.endpoints?.admin).toHaveProperty("/admin/analytics/settings");
	});

	it("settings endpoint is included when GA4 is configured", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({
			ga4MeasurementId: "G-TEST",
			ga4ApiSecret: "secret",
		});
		expect(mod.endpoints?.admin).toHaveProperty("/admin/analytics/settings");
	});

	it("settings endpoint is included when no providers are configured", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({});
		expect(mod.endpoints?.admin).toHaveProperty("/admin/analytics/settings");
	});

	it("admin pages always include the Settings page", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({});
		const paths = mod.admin?.pages?.map((p) => p.path) ?? [];
		expect(paths).toContain("/admin/analytics/settings");
	});

	it("client-config endpoint is always included in store endpoints", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({});
		expect(mod.endpoints?.store).toHaveProperty("/analytics/client-config");
	});

	it("passes gtmContainerId option through to the module", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({ gtmContainerId: "GTM-WIRED" });
		expect(mod.options).toMatchObject({ gtmContainerId: "GTM-WIRED" });
	});

	it("passes ga4 options through to the module", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({
			ga4MeasurementId: "G-WIRED",
			ga4ApiSecret: "secret123",
		});
		expect(mod.options).toMatchObject({
			ga4MeasurementId: "G-WIRED",
			ga4ApiSecret: "secret123",
		});
	});

	it("passes sentryDsn option through to the module", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({ sentryDsn: "https://key@sentry.io/1" });
		expect(mod.options).toMatchObject({
			sentryDsn: "https://key@sentry.io/1",
		});
	});
});
