import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ProductQaController } from "../../service";

export const submitAnswer = createStoreEndpoint(
	"/product-qa/questions/:questionId/answer",
	{
		method: "POST",
		params: z.object({
			questionId: z.string(),
		}),
		body: z.object({
			authorName: z.string().max(200).transform(sanitizeText),
			authorEmail: z.string().email(),
			body: z.string().max(5000).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.productQa as ProductQaController;

		// Verify question exists
		const question = await controller.getQuestion(ctx.params.questionId);
		if (!question) {
			return { error: "Question not found" };
		}

		const customerId = ctx.context.session?.user.id;
		const answer = await controller.createAnswer({
			questionId: ctx.params.questionId,
			productId: question.productId,
			authorName: ctx.body.authorName,
			authorEmail: ctx.body.authorEmail,
			body: ctx.body.body,
			customerId,
		});
		return { answer };
	},
);
