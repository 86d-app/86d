import { createStoreEndpoint } from "@86d-app/core";
import type { AppointmentController } from "../../service";

export const getAppointment = createStoreEndpoint(
	"/appointments/:id",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.appointments as AppointmentController;

		const appointment = await controller.getAppointment(ctx.params.id);
		if (!appointment) {
			return { error: "Appointment not found", status: 404 };
		}

		return { appointment };
	},
);
