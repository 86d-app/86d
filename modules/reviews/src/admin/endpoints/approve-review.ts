import { createAdminEndpoint, z } from "@86d-app/core";
import type { ReviewController } from "../../service";

export const approveReview = createAdminEndpoint(
	"/admin/reviews/:id/approve",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.reviews as ReviewController;
		const review = await controller.updateReviewStatus(
			ctx.params.id,
			"approved",
		);
		if (!review) return { error: "Review not found", status: 404 };
		return { review };
	},
);
