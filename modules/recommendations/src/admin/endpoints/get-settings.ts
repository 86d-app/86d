import { createAdminEndpoint } from "@86d-app/core";
import type { RecommendationController } from "../../service";

function maskKey(key: string): string {
	if (key.length <= 8) return `${key.slice(0, 2)}••••••`;
	return `${key.slice(0, 4)}${"•".repeat(Math.min(key.length - 4, 20))}`;
}

interface RecommendationsModuleOptions {
	openaiApiKey?: string;
	openrouterApiKey?: string;
	embeddingModel?: string;
}

export const getSettings = createAdminEndpoint(
	"/admin/recommendations/settings",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.recommendations as RecommendationController;
		const options = ctx.context.options as
			| RecommendationsModuleOptions
			| undefined;

		const stats = await controller.getStats();

		const aiConfigured = Boolean(
			options?.openaiApiKey || options?.openrouterApiKey,
		);

		return {
			ai: {
				configured: aiConfigured,
				provider: options?.openaiApiKey
					? "openai"
					: options?.openrouterApiKey
						? "openrouter"
						: null,
				model: options?.embeddingModel ?? "text-embedding-3-small",
				apiKey: options?.openaiApiKey
					? maskKey(options.openaiApiKey)
					: options?.openrouterApiKey
						? maskKey(options.openrouterApiKey)
						: null,
			},
			embeddingsCount: stats.embeddingsCount,
		};
	},
);
