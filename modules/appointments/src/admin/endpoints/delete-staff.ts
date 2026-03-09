import { createAdminEndpoint } from "@86d-app/core";
import type { AppointmentController } from "../../service";

export const deleteStaff = createAdminEndpoint(
	"/admin/appointments/staff/:id/delete",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.appointments as AppointmentController;

		const deleted = await controller.deleteStaff(ctx.params.id);
		if (!deleted) {
			return { error: "Staff member not found", status: 404 };
		}

		return { success: true };
	},
);
