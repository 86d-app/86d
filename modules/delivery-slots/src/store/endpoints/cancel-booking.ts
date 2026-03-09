import { createStoreEndpoint } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const cancelBookingStore = createStoreEndpoint(
	"/delivery-slots/bookings/:id/cancel",
	{ method: "POST" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const booking = await controller.cancelBooking(ctx.params.id);
		if (!booking) return { error: "Booking not found" };
		return { booking };
	},
);
