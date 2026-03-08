import { createAdminEndpoint } from "@86d-app/core";
import type { RecommendationController } from "../../service";

export const deleteRule = createAdminEndpoint(
	"/admin/recommendations/rules/:id/delete",
	{ method: "POST" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.recommendations as RecommendationController;

		const deleted = await controller.deleteRule(ctx.params.id);

		if (!deleted) {
			return { error: "Rule not found", status: 404 };
		}

		return { success: true };
	},
);
