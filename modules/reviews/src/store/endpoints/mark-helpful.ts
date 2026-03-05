import { createStoreEndpoint, z } from "@86d-app/core";
import type { ReviewController } from "../../service";

export const markHelpful = createStoreEndpoint(
	"/reviews/:id/helpful",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.reviews as ReviewController;
		const review = await controller.markHelpful(ctx.params.id);
		if (!review) return { error: "Review not found", status: 404 };
		return { helpfulCount: review.helpfulCount };
	},
);
