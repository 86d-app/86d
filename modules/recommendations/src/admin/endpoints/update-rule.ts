import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { RecommendationController } from "../../service";

export const updateRule = createAdminEndpoint(
	"/admin/recommendations/rules/:id",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText).optional(),
			strategy: z
				.enum(["manual", "bought_together", "trending", "personalized"])
				.optional(),
			sourceProductId: z.string().optional(),
			targetProductIds: z.array(z.string()).min(1).max(100).optional(),
			weight: z.number().min(0).max(100).optional(),
			isActive: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.recommendations as RecommendationController;

		const rule = await controller.updateRule(ctx.params.id, {
			name: ctx.body.name,
			strategy: ctx.body.strategy,
			sourceProductId: ctx.body.sourceProductId,
			targetProductIds: ctx.body.targetProductIds,
			weight: ctx.body.weight,
			isActive: ctx.body.isActive,
		});

		if (!rule) {
			return { error: "Rule not found", status: 404 };
		}

		return { rule };
	},
);
