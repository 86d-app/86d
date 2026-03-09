import { createAdminEndpoint } from "@86d-app/core";
import type { AppointmentController } from "../../service";

export const deleteService = createAdminEndpoint(
	"/admin/appointments/services/:id/delete",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.appointments as AppointmentController;

		const deleted = await controller.deleteService(ctx.params.id);
		if (!deleted) {
			return { error: "Service not found", status: 404 };
		}

		return { success: true };
	},
);
