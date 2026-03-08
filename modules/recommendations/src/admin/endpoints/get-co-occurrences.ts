import { createAdminEndpoint, z } from "@86d-app/core";
import type { RecommendationController } from "../../service";

export const getCoOccurrences = createAdminEndpoint(
	"/admin/recommendations/co-occurrences/:productId",
	{
		method: "GET",
		query: z.object({
			take: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.recommendations as RecommendationController;

		const coOccurrences = await controller.getCoOccurrences(
			ctx.params.productId,
			{ take: ctx.query.take },
		);

		return { coOccurrences };
	},
);
