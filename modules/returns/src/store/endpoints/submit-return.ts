import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ReturnController } from "../../service";

export const submitReturn = createStoreEndpoint(
	"/returns/submit",
	{
		method: "POST",
		body: z.object({
			orderId: z.string(),
			reason: z.string().min(1).max(1000).transform(sanitizeText),
			refundMethod: z
				.enum(["original_payment", "store_credit", "exchange"])
				.optional(),
			customerNotes: z.string().max(2000).transform(sanitizeText).optional(),
			items: z
				.array(
					z.object({
						orderItemId: z.string(),
						productName: z.string().max(500).transform(sanitizeText),
						sku: z.string().optional(),
						quantity: z.number().int().min(1),
						unitPrice: z.number().min(0),
						reason: z.enum([
							"damaged",
							"defective",
							"wrong_item",
							"not_as_described",
							"changed_mind",
							"too_small",
							"too_large",
							"other",
						]),
						condition: z
							.enum(["unopened", "opened", "used", "damaged"])
							.optional(),
						notes: z.string().max(500).transform(sanitizeText).optional(),
					}),
				)
				.min(1),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user?.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.returns as ReturnController;
		const returnRequest = await controller.create({
			orderId: ctx.body.orderId,
			customerId: userId,
			reason: ctx.body.reason,
			refundMethod: ctx.body.refundMethod,
			customerNotes: ctx.body.customerNotes,
			items: ctx.body.items,
		});

		return { return: returnRequest };
	},
);
