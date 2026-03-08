import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ProductQaController } from "../../service";

export const submitQuestion = createStoreEndpoint(
	"/product-qa/questions",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			authorName: z.string().max(200).transform(sanitizeText),
			authorEmail: z.string().email(),
			body: z.string().max(5000).transform(sanitizeText),
			customerId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.productQa as ProductQaController;
		const question = await controller.createQuestion({
			productId: ctx.body.productId,
			authorName: ctx.body.authorName,
			authorEmail: ctx.body.authorEmail,
			body: ctx.body.body,
			customerId: ctx.body.customerId,
		});
		return { question };
	},
);
