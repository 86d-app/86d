import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { OpenAIEmbeddingProvider } from "./embedding-provider";
import { searchSchema } from "./schema";
import { createSearchController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type { EmbeddingProvider } from "./embedding-provider";

export { OpenAIEmbeddingProvider } from "./embedding-provider";
export type {
	SearchClick,
	SearchController,
	SearchFacets,
	SearchHighlight,
	SearchIndexItem,
	SearchQuery,
	SearchResult,
	SearchSortField,
	SearchSynonym,
} from "./service";

export interface SearchOptions extends ModuleConfig {
	/** Maximum number of search results per query */
	maxResults?: number;
	/** OpenAI API key for AI-powered semantic search */
	openaiApiKey?: string;
	/** OpenRouter API key (alternative to OpenAI) */
	openrouterApiKey?: string;
	/** Embedding model name (default: text-embedding-3-small) */
	embeddingModel?: string;
}

export default function search(options?: SearchOptions): Module {
	// Create embedding provider from env-var-based API keys
	let embeddingProvider: OpenAIEmbeddingProvider | undefined;
	if (options?.openaiApiKey) {
		embeddingProvider = new OpenAIEmbeddingProvider(options.openaiApiKey, {
			...(options.embeddingModel ? { model: options.embeddingModel } : {}),
		});
	} else if (options?.openrouterApiKey) {
		embeddingProvider = new OpenAIEmbeddingProvider(options.openrouterApiKey, {
			model: options.embeddingModel ?? "openai/text-embedding-3-small",
			baseUrl: "https://openrouter.ai/api/v1" as string,
		});
	}

	return {
		id: "search",
		version: "0.1.0",
		schema: searchSchema,
		exports: {
			read: ["searchIndexCount", "popularTerms"],
		},
		events: {
			emits: [
				"search.queried",
				"search.indexed",
				"search.removed",
				"search.clicked",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createSearchController(ctx.data, embeddingProvider);
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
					group: "System",
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
