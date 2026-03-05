import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { OrderController, ReturnStatus } from "../../service";

export const adminUpdateReturn = createAdminEndpoint(
	"/admin/returns/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
		body: z.object({
			status: z
				.enum([
					"requested",
					"approved",
					"rejected",
					"shipped_back",
					"received",
					"refunded",
					"completed",
				])
				.optional(),
			adminNotes: z.string().max(5000).transform(sanitizeText).optional(),
			refundAmount: z.number().min(0).optional(),
			trackingNumber: z.string().max(200).transform(sanitizeText).optional(),
			trackingUrl: z.string().url().max(2000).optional(),
			carrier: z.string().max(100).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		const existing = await controller.getReturn(ctx.params.id);
		if (!existing) {
			return { error: "Return request not found", status: 404 };
		}

		const previousStatus = existing.status;
		const returnRequest = await controller.updateReturn(ctx.params.id, {
			status: ctx.body.status as ReturnStatus | undefined,
			adminNotes: ctx.body.adminNotes,
			refundAmount: ctx.body.refundAmount,
			trackingNumber: ctx.body.trackingNumber,
			trackingUrl: ctx.body.trackingUrl,
			carrier: ctx.body.carrier,
		});

		if (!returnRequest) {
			return { error: "Failed to update return request", status: 500 };
		}

		// Emit events on status transitions
		if (
			ctx.context.events &&
			ctx.body.status &&
			ctx.body.status !== previousStatus
		) {
			const order = await controller.getById(existing.orderId);
			const email = order?.guestEmail ?? "";

			if (ctx.body.status === "approved") {
				await ctx.context.events.emit("return.approved", {
					returnId: returnRequest.id,
					orderId: existing.orderId,
					orderNumber: order?.orderNumber ?? "",
					email,
					customerName: "Customer",
				});
			} else if (ctx.body.status === "rejected") {
				await ctx.context.events.emit("return.rejected", {
					returnId: returnRequest.id,
					orderId: existing.orderId,
					orderNumber: order?.orderNumber ?? "",
					email,
					customerName: "Customer",
					adminNotes: returnRequest.adminNotes,
				});
			} else if (ctx.body.status === "refunded") {
				await ctx.context.events.emit("return.refunded", {
					returnId: returnRequest.id,
					orderId: existing.orderId,
					orderNumber: order?.orderNumber ?? "",
					email,
					customerName: "Customer",
					refundAmount: returnRequest.refundAmount,
				});
			} else if (ctx.body.status === "completed") {
				await ctx.context.events.emit("return.completed", {
					returnId: returnRequest.id,
					orderId: existing.orderId,
					orderNumber: order?.orderNumber ?? "",
					email,
					customerName: "Customer",
				});
			}
		}

		return { returnRequest };
	},
);
