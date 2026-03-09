import { createAdminEndpoint } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const deleteBlackout = createAdminEndpoint(
	"/admin/delivery-slots/blackouts/:id/delete",
	{ method: "POST" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const deleted = await controller.deleteBlackout(ctx.params.id);
		return { deleted };
	},
);
