import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { recommendationsSchema } from "./schema";
import { createRecommendationController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CoOccurrence,
	ProductInteraction,
	RecommendationController,
	RecommendationRule,
	RecommendedProduct,
} from "./service";

export interface RecommendationsOptions extends ModuleConfig {
	/** Default number of recommendations to return. Default: 10. */
	defaultTake?: string;
	/** Trending window in days. Default: 7. */
	trendingWindowDays?: string;
}

export default function recommendations(
	options?: RecommendationsOptions,
): Module {
	return {
		id: "recommendations",
		version: "0.0.1",
		schema: recommendationsSchema,
		exports: {
			read: [
				"recommendationRules",
				"coOccurrences",
				"productInteractions",
				"recommendedProducts",
			],
		},
		events: {
			emits: ["recommendation.served", "recommendation.interaction.tracked"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createRecommendationController(ctx.data);
			return { controllers: { recommendations: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/recommendations",
					component: "RecommendationAdmin",
					label: "Recommendations",
					icon: "Sparkles",
					group: "Marketing",
				},
			],
		},
		options,
	};
}
