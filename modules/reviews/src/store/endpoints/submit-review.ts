import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ReviewController } from "../../service";

export const submitReview = createStoreEndpoint(
	"/reviews",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			authorName: z.string().max(200).transform(sanitizeText),
			authorEmail: z.string().email(),
			rating: z.number().int().min(1).max(5),
			title: z.string().max(500).transform(sanitizeText).optional(),
			body: z.string().max(10000).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.reviews as ReviewController;
		const customerId = ctx.context.session?.user.id;
		const review = await controller.createReview({
			productId: ctx.body.productId,
			authorName: ctx.body.authorName,
			authorEmail: ctx.body.authorEmail,
			rating: ctx.body.rating,
			title: ctx.body.title,
			body: ctx.body.body,
			customerId,
			isVerifiedPurchase: false,
		});
		return { review };
	},
);
