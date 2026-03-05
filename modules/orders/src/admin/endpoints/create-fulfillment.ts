import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const adminCreateFulfillment = createAdminEndpoint(
	"/admin/orders/:id/fulfillments",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			carrier: z.string().max(100).transform(sanitizeText).optional(),
			trackingNumber: z.string().max(200).transform(sanitizeText).optional(),
			trackingUrl: z.string().url().max(2000).optional(),
			notes: z.string().max(5000).transform(sanitizeText).optional(),
			items: z.array(
				z.object({
					orderItemId: z.string(),
					quantity: z.number().int().min(1),
				}),
			),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		const order = await controller.getById(ctx.params.id);
		if (!order) {
			return { error: "Order not found", status: 404 };
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

		const fulfillment = await controller.createFulfillment({
			orderId: ctx.params.id,
			carrier: ctx.body.carrier,
			trackingNumber: ctx.body.trackingNumber,
			trackingUrl: ctx.body.trackingUrl,
			notes: ctx.body.notes,
			items: ctx.body.items,
		});

		// Emit order.shipped event for email notifications
		if (ctx.context.events && fulfillment.status === "shipped") {
			const email = order.guestEmail ?? "";
			const customerName = "Customer";
			await ctx.context.events.emit("order.shipped", {
				orderId: order.id,
				orderNumber: order.orderNumber,
				email,
				customerName,
				trackingNumber: fulfillment.trackingNumber,
				trackingUrl: fulfillment.trackingUrl,
				carrier: fulfillment.carrier,
			});
		}

		const fulfillmentStatus = await controller.getOrderFulfillmentStatus(
			ctx.params.id,
		);

		return { fulfillment, fulfillmentStatus };
	},
);
