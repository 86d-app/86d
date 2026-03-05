import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const cancelMyOrder = createStoreEndpoint(
	"/orders/me/:id/cancel",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
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

		const cancelled = await controller.cancel(ctx.params.id);
		if (!cancelled) {
			return {
				error: "Order cannot be cancelled in its current state",
				status: 422,
			};
		}

		// Emit order.cancelled event for email notifications
		if (ctx.context.events) {
			await ctx.context.events.emit("order.cancelled", {
				orderId: cancelled.id,
				orderNumber: cancelled.orderNumber,
				email: cancelled.guestEmail ?? ctx.context.session?.user.email ?? "",
				customerName: ctx.context.session?.user.name ?? "Customer",
				reason: "Cancelled by customer",
			});
		}

		return { order: cancelled };
	},
);
