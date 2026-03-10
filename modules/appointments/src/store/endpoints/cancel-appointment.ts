import { createStoreEndpoint, z } from "@86d-app/core";
import type { AppointmentController } from "../../service";

export const cancelAppointment = createStoreEndpoint(
	"/appointments/:id/cancel",
	{
		method: "POST",
		body: z.object({}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.appointments as AppointmentController;

		const appointment = await controller.cancelAppointment(ctx.params.id);
		if (!appointment) {
			return { error: "Appointment not found", status: 404 };
		}

		if (appointment.customerId && appointment.customerId !== session.user.id) {
			return { error: "Appointment not found", status: 404 };
		}

		return { appointment };
	},
);
