import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

/**
 * Guest order confirmation lookup.
 * Allows a guest to fetch their order by ID + email after checkout.
 * Returns the order only if the email matches the guestEmail on the order.
 * Authenticated users whose customerId matches the order also get access.
 */
export const confirmOrder = createStoreEndpoint(
	"/orders/confirm",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1, "Order ID is required").max(128),
			email: z
				.string()
				.email("Valid email is required")
				.max(320)
				.transform((v) => v.toLowerCase().trim()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;
		const { orderId, email } = ctx.body;

		const order = await controller.getById(orderId);
		if (!order) {
			return { error: "Order not found", status: 404 };
		}

		// Allow if logged-in user owns this order
		const userId = ctx.context.session?.user.id;
		if (userId && order.customerId === userId) {
			return { order };
		}

		// Allow if email matches the guest email on the order
		if (order.guestEmail && order.guestEmail.toLowerCase().trim() === email) {
			return { order };
		}

		// Return 404 (not 403) to avoid leaking order existence
		return { error: "Order not found", status: 404 };
	},
);
