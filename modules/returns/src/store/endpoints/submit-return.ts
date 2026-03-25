import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ReturnController } from "../../service";

export const submitReturn = createStoreEndpoint(
	"/returns/submit",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().max(200),
			reason: z.string().min(1).max(1000).transform(sanitizeText),
			refundMethod: z
				.enum(["original_payment", "store_credit", "exchange"])
				.optional(),
			customerNotes: z.string().max(2000).transform(sanitizeText).optional(),
			items: z
				.array(
					z.object({
						orderItemId: z.string().max(200),
						productName: z.string().max(500).transform(sanitizeText),
						sku: z.string().max(200).optional(),
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
				.min(1)
				.max(100),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user?.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const orderCtrl = ctx.context.controllers.order as
			| { getById(id: string): Promise<{ customerId?: string } | null> }
			| undefined;
		if (orderCtrl) {
			const order = await orderCtrl.getById(ctx.body.orderId);
			if (!order || order.customerId !== userId) {
				return { error: "Order not found", status: 404 };
			}
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
