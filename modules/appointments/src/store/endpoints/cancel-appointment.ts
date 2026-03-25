import { createStoreEndpoint, z } from "@86d-app/core";
import type { AppointmentController } from "../../service";

export const cancelAppointment = createStoreEndpoint(
	"/appointments/:id/cancel",
	{
		method: "POST",
		params: z.object({ id: z.string().max(200) }),
		body: z.object({}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.appointments as AppointmentController;

		const existing = await controller.getAppointment(ctx.params.id);
		if (!existing) {
			return { error: "Appointment not found", status: 404 };
		}

		if (existing.customerId && existing.customerId !== session.user.id) {
			return { error: "Appointment not found", status: 404 };
		}

		const appointment = await controller.cancelAppointment(ctx.params.id);
		if (!appointment) {
			return { error: "Appointment not found", status: 404 };
		}

		return { appointment };
	},
);
