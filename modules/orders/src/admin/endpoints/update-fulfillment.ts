import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { FulfillmentStatus, OrderController } from "../../service";

export const adminUpdateFulfillment = createAdminEndpoint(
	"/admin/fulfillments/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
		body: z.object({
			status: z
				.enum(["pending", "shipped", "in_transit", "delivered", "failed"])
				.optional(),
			carrier: z.string().max(100).transform(sanitizeText).optional(),
			trackingNumber: z.string().max(200).transform(sanitizeText).optional(),
			trackingUrl: z.string().url().max(2000).optional(),
			notes: z.string().max(5000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		const existing = await controller.getFulfillment(ctx.params.id);
		if (!existing) {
			return { error: "Fulfillment not found", status: 404 };
		}

		const previousStatus = existing.status;
		const fulfillment = await controller.updateFulfillment(ctx.params.id, {
			status: ctx.body.status as FulfillmentStatus | undefined,
			carrier: ctx.body.carrier,
			trackingNumber: ctx.body.trackingNumber,
			trackingUrl: ctx.body.trackingUrl,
			notes: ctx.body.notes,
		});

		if (!fulfillment) {
			return { error: "Failed to update fulfillment", status: 500 };
		}

		if (ctx.context.events) {
			const order = await controller.getById(existing.orderId);
			if (order) {
				const email = order.guestEmail ?? "";
				const customerName = "Customer";

				// Emit order.shipped event when status transitions to shipped
				if (ctx.body.status === "shipped" && previousStatus !== "shipped") {
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

				// Emit shipment.delivered event when status transitions to delivered
				if (ctx.body.status === "delivered" && previousStatus !== "delivered") {
					await ctx.context.events.emit("shipment.delivered", {
						orderId: order.id,
						orderNumber: order.orderNumber,
						email,
						customerName,
						deliveredAt: new Date().toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
							hour: "numeric",
							minute: "2-digit",
						}),
					});
				}
			}
		}

		return { fulfillment };
	},
);
