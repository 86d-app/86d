import { createAdminEndpoint, z } from "@86d-app/core";
import type { ReviewController } from "../../service";

export const sendReviewRequest = createAdminEndpoint(
	"/admin/reviews/send-request",
	{
		method: "POST",
		body: z.object({
			orderId: z.string(),
			orderNumber: z.string(),
			email: z.string().email(),
			customerName: z.string(),
			items: z.array(
				z.object({
					productId: z.string(),
					name: z.string(),
				}),
			),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.reviews as ReviewController;

		const existing = await controller.getReviewRequest(ctx.body.orderId);
		if (existing) {
			return {
				error: "Review request already sent for this order",
				status: 409,
			};
		}

		const request = await controller.createReviewRequest({
			orderId: ctx.body.orderId,
			orderNumber: ctx.body.orderNumber,
			email: ctx.body.email,
			customerName: ctx.body.customerName,
			items: ctx.body.items,
		});
		return { request };
	},
);
