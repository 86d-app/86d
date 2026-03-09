import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { AppointmentController } from "../../service";

export const updateAppointment = createAdminEndpoint(
	"/admin/appointments/:id/update",
	{
		method: "POST",
		body: z.object({
			status: z
				.enum(["pending", "confirmed", "cancelled", "completed", "no-show"])
				.optional(),
			notes: z.string().max(2000).transform(sanitizeText).nullable().optional(),
			startsAt: z.coerce.date().optional(),
			staffId: z.string().min(1).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.appointments as AppointmentController;

		const params: Parameters<typeof controller.updateAppointment>[1] = {};
		if (ctx.body.status != null) params.status = ctx.body.status;
		if (ctx.body.notes !== undefined) params.notes = ctx.body.notes;
		if (ctx.body.startsAt != null) params.startsAt = ctx.body.startsAt;
		if (ctx.body.staffId != null) params.staffId = ctx.body.staffId;

		const appointment = await controller.updateAppointment(
			ctx.params.id,
			params,
		);
		if (!appointment) {
			return { error: "Appointment not found", status: 404 };
		}

		return { appointment };
	},
);
