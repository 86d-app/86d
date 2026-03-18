import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import { performCancellationEffects } from "../../cancel-effects";
import type {
	CustomerLookupController,
	InventoryReleaseController,
	OrderController,
	OrderStatus,
	OrderWithDetails,
	PaymentRefundController,
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

		// Perform cancellation side effects when transitioning to "cancelled"
		if (status === "cancelled" && previousStatus !== "cancelled") {
			const paymentRefundController = ctx.context.controllers
				.payments as unknown as PaymentRefundController | undefined;
			const inventoryController = ctx.context.controllers
				.inventory as unknown as InventoryReleaseController | undefined;

			await performCancellationEffects({
				order,
				orderController: controller,
				paymentController: paymentRefundController,
				inventoryController,
				cancelledBy: "admin",
			});
		}

		// Emit events for status transitions that trigger email notifications
		if (ctx.context.events && status && status !== previousStatus) {
			const { email, customerName } = await resolveContactInfo(
				order,
				ctx.context.controllers.customers as unknown as
					| CustomerLookupController
					| undefined,
			);

			if (status === "completed") {
				await ctx.context.events.emit("order.fulfilled", {
					orderId: order.id,
					orderNumber: order.orderNumber,
					customerId: order.customerId,
					email,
					customerName,
				});
			} else if (status === "cancelled") {
				await ctx.context.events.emit("order.cancelled", {
					orderId: order.id,
					orderNumber: order.orderNumber,
					customerId: order.customerId,
					email,
					customerName,
					reason: order.notes,
				});
			}
		}

		return { order };
	},
);

/**
 * Resolve the customer email and display name from the order.
 * For registered customers: look up via the customers controller.
 * For guests: use guestEmail and shipping address name.
 */
async function resolveContactInfo(
	order: OrderWithDetails,
	customerController: CustomerLookupController | undefined,
): Promise<{ email: string; customerName: string }> {
	// Try looking up the registered customer
	if (order.customerId && customerController) {
		try {
			const customer = await customerController.getById(order.customerId);
			if (customer) {
				const name = [customer.firstName, customer.lastName]
					.filter(Boolean)
					.join(" ");
				return {
					email: customer.email,
					customerName: name || "Customer",
				};
			}
		} catch {
			// Fall through to address / guest fallbacks
		}
	}

	// Fall back to guest email
	const email = order.guestEmail ?? "";

	// Try to derive name from shipping address
	const shipping = order.addresses?.find((a) => a.type === "shipping");
	if (shipping) {
		const name = [shipping.firstName, shipping.lastName]
			.filter(Boolean)
			.join(" ");
		if (name) return { email, customerName: name };
	}

	return { email, customerName: "Customer" };
}
