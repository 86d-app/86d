import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import {
	adminEndpoints,
	createAdminEndpointsWithSettings,
} from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { analyticsSchema } from "./schema";
import { createAnalyticsController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	AnalyticsController,
	AnalyticsEvent,
	EventStats,
	EventType,
	FunnelStep,
	ProductSalesStats,
	ProductStats,
	RecentlyViewedItem,
	RevenueSummary,
	RevenueTimeSeriesPoint,
	SearchAnalytics,
	SearchQueryStats,
} from "./service";

export interface AnalyticsOptions extends ModuleConfig {
	/** Maximum events to retain (default: unlimited). Not enforced at module level. */
	maxEvents?: string;
	/** Google Tag Manager container ID (e.g. "GTM-XXXXXXX") */
	gtmContainerId?: string | undefined;
	/** Sentry DSN for error tracking and performance monitoring */
	sentryDsn?: string | undefined;
}

export default function analytics(options?: AnalyticsOptions): Module {
	const hasProviders = Boolean(options?.gtmContainerId || options?.sentryDsn);

	const settingsEndpoint = createGetSettingsEndpoint({
		gtmContainerId: options?.gtmContainerId,
		sentryDsn: options?.sentryDsn,
	});

	return {
		id: "analytics",
		version: "0.0.1",
		schema: analyticsSchema,
		exports: {
			read: [
				"eventStats",
				"topProducts",
				"revenueSummary",
				"conversionFunnel",
				"salesByProduct",
			],
		},
		events: {
			emits: ["analytics.report.generated"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createAnalyticsController(ctx.data);
			return { controllers: { analytics: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: hasProviders
				? createAdminEndpointsWithSettings(settingsEndpoint)
				: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/analytics",
					component: "AnalyticsAdmin",
					label: "Analytics",
					icon: "ChartBar",
					group: "System",
				},
				{
					path: "/admin/analytics/settings",
					component: "AnalyticsSettings",
					label: "Settings",
					icon: "Gear",
					group: "System",
				},
			],
		},
		options,
	};
}
