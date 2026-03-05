import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { OrderController, ReturnType } from "../../service";
import { RETURN_REASONS } from "../../service";

export const createMyReturn = createStoreEndpoint(
	"/orders/me/:id/returns",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			type: z.enum(["refund", "exchange", "store_credit"]).optional(),
			reason: z.enum(RETURN_REASONS),
			customerNotes: z.string().max(2000).transform(sanitizeText).optional(),
			items: z.array(
				z.object({
					orderItemId: z.string(),
					quantity: z.number().int().min(1),
					reason: z.string().max(500).transform(sanitizeText).optional(),
				}),
			),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.order as OrderController;
		const order = await controller.getById(ctx.params.id);

		if (!order || order.customerId !== userId) {
			return { error: "Order not found", status: 404 };
		}

		// Only allow returns on delivered/completed orders
		if (!["completed", "processing"].includes(order.status)) {
			return {
				error: "Returns are only available for completed or processing orders",
				status: 422,
			};
		}

		if (ctx.body.items.length === 0) {
			return { error: "At least one item is required", status: 400 };
		}

		// Validate items belong to this order
		const orderItemIds = new Set(order.items.map((i) => i.id));
		for (const item of ctx.body.items) {
			if (!orderItemIds.has(item.orderItemId)) {
				return {
					error: `Item ${item.orderItemId} does not belong to this order`,
					status: 400,
				};
			}
		}

		const returnRequest = await controller.createReturn({
			orderId: ctx.params.id,
			type: ctx.body.type as ReturnType | undefined,
			reason: ctx.body.reason,
			customerNotes: ctx.body.customerNotes,
			items: ctx.body.items,
		});

		// Emit return.requested event
		if (ctx.context.events) {
			await ctx.context.events.emit("return.requested", {
				returnId: returnRequest.id,
				orderId: order.id,
				orderNumber: order.orderNumber,
				email: order.guestEmail ?? ctx.context.session?.user.email ?? "",
				customerName: ctx.context.session?.user.name ?? "Customer",
				reason: returnRequest.reason,
			});
		}

		return { returnRequest };
	},
);
