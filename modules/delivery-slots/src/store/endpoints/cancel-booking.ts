import { createStoreEndpoint } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const cancelBookingStore = createStoreEndpoint(
	"/delivery-slots/bookings/:id/cancel",
	{ method: "POST" },
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const booking = await controller.cancelBooking(ctx.params.id);
		if (!booking) return { error: "Booking not found", status: 404 };

		if (booking.customerId && booking.customerId !== session.user.id) {
			return { error: "Booking not found", status: 404 };
		}

		return { booking };
	},
);
