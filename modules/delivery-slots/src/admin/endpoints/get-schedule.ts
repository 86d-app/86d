import { createAdminEndpoint } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const getSchedule = createAdminEndpoint(
	"/admin/delivery-slots/:id",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const schedule = await controller.getSchedule(ctx.params.id);
		if (!schedule) return { error: "Schedule not found" };
		return { schedule };
	},
);
