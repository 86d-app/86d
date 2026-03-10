import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
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
}

export default function analytics(options?: AnalyticsOptions): Module {
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
			admin: adminEndpoints,
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
			],
		},
		options,
	};
}
