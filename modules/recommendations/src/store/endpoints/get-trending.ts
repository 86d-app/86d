import { createStoreEndpoint, z } from "@86d-app/core";
import type { RecommendationController } from "../../service";

export const getTrending = createStoreEndpoint(
	"/recommendations/trending",
	{
		method: "GET",
		query: z.object({
			take: z.coerce.number().int().min(1).max(50).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.recommendations as RecommendationController;

		const opts = ctx.context.options as Record<string, unknown>;
		const defaultTake = Number(opts?.defaultTake);
		const windowDays = Number(opts?.trendingWindowDays);
		const since = Number.isFinite(windowDays)
			? new Date(Date.now() - windowDays * 86_400_000)
			: undefined;

		const recommendations = await controller.getTrending({
			take:
				ctx.query.take ??
				(Number.isFinite(defaultTake) ? defaultTake : undefined),
			since,
		});

		return { recommendations };
	},
);
