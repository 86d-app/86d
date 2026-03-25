import { createStoreEndpoint, z } from "@86d-app/core";
import type { RecommendationController } from "../../service";

export const getForProduct = createStoreEndpoint(
	"/recommendations/:productId",
	{
		method: "GET",
		params: z.object({ productId: z.string().max(200) }),
		query: z.object({
			strategy: z
				.enum([
					"manual",
					"bought_together",
					"trending",
					"personalized",
					"ai_similar",
				])
				.optional(),
			take: z.coerce.number().int().min(1).max(50).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.recommendations as RecommendationController;

		const defaultTake = Number(
			(ctx.context.options as Record<string, unknown>)?.defaultTake,
		);

		const recommendations = await controller.getForProduct(
			ctx.params.productId,
			{
				strategy: ctx.query.strategy,
				take:
					ctx.query.take ??
					(Number.isFinite(defaultTake) ? defaultTake : undefined),
			},
		);

		return { recommendations };
	},
);
