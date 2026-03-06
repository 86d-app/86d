import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { searchSchema } from "./schema";
import { createSearchController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	SearchController,
	SearchIndexItem,
	SearchQuery,
	SearchResult,
	SearchSynonym,
} from "./service";

export interface SearchOptions extends ModuleConfig {
	/** Maximum number of search results per query */
	maxResults?: number;
}

export default function search(options?: SearchOptions): Module {
	return {
		id: "search",
		version: "0.0.1",
		schema: searchSchema,
		exports: {
			read: ["searchIndexCount", "popularTerms"],
		},
		events: {
			emits: ["search.queried", "search.indexed", "search.removed"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createSearchController(ctx.data);
			return { controllers: { search: controller } };
		},
		search: { store: "/search/store-search" },
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/search",
					component: "SearchAnalytics",
					label: "Search",
					icon: "MagnifyingGlass",
					group: "Marketing",
				},
			],
		},
		store: {
			pages: [
				{
					path: "/search",
					component: "SearchPage",
				},
			],
		},
		options,
	};
}
