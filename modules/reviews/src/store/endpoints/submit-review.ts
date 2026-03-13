import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ReviewController } from "../../service";

const imageSchema = z.object({
	url: z.string().url().max(2000),
	caption: z.string().max(500).transform(sanitizeText).optional(),
});

export const submitReview = createStoreEndpoint(
	"/reviews",
	{
		method: "POST",
		body: z.object({
			productId: z.string().max(200),
			authorName: z.string().max(200).transform(sanitizeText),
			authorEmail: z.string().email(),
			rating: z.number().int().min(1).max(5),
			title: z.string().max(500).transform(sanitizeText).optional(),
			body: z.string().max(10000).transform(sanitizeText),
			images: z.array(imageSchema).max(5).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.reviews as ReviewController;
		const customerId = ctx.context.session?.user.id;

		// Prevent duplicate reviews from authenticated customers
		if (customerId) {
			const alreadyReviewed = await controller.hasReviewedProduct(
				customerId,
				ctx.body.productId,
			);
			if (alreadyReviewed) {
				return {
					error: "You have already reviewed this product",
					status: 409,
				};
			}
		}

		const review = await controller.createReview({
			productId: ctx.body.productId,
			authorName: ctx.body.authorName,
			authorEmail: ctx.body.authorEmail,
			rating: ctx.body.rating,
			title: ctx.body.title,
			body: ctx.body.body,
			customerId,
			isVerifiedPurchase: false,
			images: ctx.body.images,
		});
		return { review };
	},
);
