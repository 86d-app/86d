import { createAdminEndpoint } from "@86d-app/core";
import type { SearchController } from "../../service";

function maskKey(key: string): string {
	if (key.length <= 8) return `${key.slice(0, 2)}••••••`;
	return `${key.slice(0, 4)}${"•".repeat(Math.min(key.length - 4, 20))}`;
}

interface SearchModuleOptions {
	meilisearchHost?: string;
	meilisearchApiKey?: string;
	meilisearchIndexUid?: string;
	openaiApiKey?: string;
	openrouterApiKey?: string;
	embeddingModel?: string;
}

export const getSettings = createAdminEndpoint(
	"/admin/search/settings",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers.search as SearchController;
		const options = ctx.context.options as SearchModuleOptions | undefined;

		const meilisearchConfigured = Boolean(
			options?.meilisearchHost && options?.meilisearchApiKey,
		);

		const embeddingConfigured = Boolean(
			options?.openaiApiKey || options?.openrouterApiKey,
		);

		const indexCount = await controller.getIndexCount();

		return {
			meilisearch: {
				configured: meilisearchConfigured,
				host: options?.meilisearchHost ?? null,
				apiKey: options?.meilisearchApiKey
					? maskKey(options.meilisearchApiKey)
					: null,
				indexUid: options?.meilisearchIndexUid ?? "search",
			},
			embeddings: {
				configured: embeddingConfigured,
				provider: options?.openaiApiKey
					? "openai"
					: options?.openrouterApiKey
						? "openrouter"
						: null,
				model: options?.embeddingModel ?? "text-embedding-3-small",
			},
			indexCount,
		};
	},
);
