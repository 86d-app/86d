import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type {
	OrderController,
	OrderStatus,
	PaymentStatus,
} from "../../service";

export const adminUpdateOrder = createAdminEndpoint(
	"/admin/orders/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
		body: z.object({
			status: z
				.enum([
					"pending",
					"processing",
					"on_hold",
					"completed",
					"cancelled",
					"refunded",
				])
				.optional(),
			paymentStatus: z
				.enum(["unpaid", "paid", "partially_paid", "refunded", "voided"])
				.optional(),
			notes: z.string().max(5000).transform(sanitizeText).optional(),
			metadata: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 50, "Too many keys")
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		let order = await controller.getById(ctx.params.id);
		if (!order) {
			return { error: "Order not found", status: 404 };
		}

		const previousStatus = order.status;
		const { status, paymentStatus, notes, metadata } = ctx.body;

		if (status) {
			const updated = await controller.updateStatus(
				ctx.params.id,
				status as OrderStatus,
			);
			if (updated) order = { ...order, ...updated };
		}

		if (paymentStatus) {
			const updated = await controller.updatePaymentStatus(
				ctx.params.id,
				paymentStatus as PaymentStatus,
			);
			if (updated) order = { ...order, ...updated };
		}

		if (notes !== undefined || metadata !== undefined) {
			const updated = await controller.update(ctx.params.id, {
				...(notes !== undefined ? { notes } : {}),
				...(metadata !== undefined
					? { metadata: metadata as Record<string, unknown> }
					: {}),
			});
			if (updated) order = { ...order, ...updated };
		}

		// Emit events for status transitions that trigger email notifications
		if (ctx.context.events && status && status !== previousStatus) {
			const email = order.guestEmail ?? "";
			const customerName = "Customer";

			if (status === "completed") {
				await ctx.context.events.emit("order.fulfilled", {
					orderId: order.id,
					orderNumber: order.orderNumber,
					email,
					customerName,
				});
			} else if (status === "cancelled") {
				await ctx.context.events.emit("order.cancelled", {
					orderId: order.id,
					orderNumber: order.orderNumber,
					email,
					customerName,
					reason: order.notes,
				});
			}
		}

		return { order };
	},
);
