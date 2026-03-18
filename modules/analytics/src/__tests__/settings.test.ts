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
}

/** Mirrors the logic inside createGetSettingsEndpoint without the HTTP wrapper. */
function getSettings(options: SettingsOptions) {
	const gtmConfigured = Boolean(options.gtmContainerId);
	const sentryConfigured = Boolean(options.sentryDsn);
	return {
		gtm: {
			configured: gtmConfigured,
			provider: "google-tag-manager" as const,
			containerId: options.gtmContainerId ?? null,
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

	describe("combined configuration", () => {
		it("reports both providers as configured when both are provided", () => {
			const result = getSettings({
				gtmContainerId: "GTM-ABC123",
				sentryDsn: "https://key@sentry.io/123",
			});
			expect(result.gtm.configured).toBe(true);
			expect(result.sentry.configured).toBe(true);
		});

		it("reports neither provider as configured when both are missing", () => {
			const result = getSettings({});
			expect(result.gtm.configured).toBe(false);
			expect(result.sentry.configured).toBe(false);
		});

		it("reports only GTM when only GTM is provided", () => {
			const result = getSettings({ gtmContainerId: "GTM-XYZ" });
			expect(result.gtm.configured).toBe(true);
			expect(result.sentry.configured).toBe(false);
		});

		it("reports only Sentry when only Sentry is provided", () => {
			const result = getSettings({
				sentryDsn: "https://key@sentry.io/123",
			});
			expect(result.gtm.configured).toBe(false);
			expect(result.sentry.configured).toBe(true);
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

	it("settings endpoint is not included when neither is configured", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({});
		expect(mod.endpoints?.admin).not.toHaveProperty(
			"/admin/analytics/settings",
		);
	});

	it("admin pages always include the Settings page", async () => {
		const { default: analytics } = await import("../index");
		const mod = analytics({});
		const paths = mod.admin?.pages?.map((p) => p.path) ?? [];
		expect(paths).toContain("/admin/analytics/settings");
	});
});
