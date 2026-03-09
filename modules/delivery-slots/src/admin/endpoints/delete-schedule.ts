import { createAdminEndpoint } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const deleteSchedule = createAdminEndpoint(
	"/admin/delivery-slots/:id/delete",
	{ method: "POST" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const deleted = await controller.deleteSchedule(ctx.params.id);
		return { deleted };
	},
);
