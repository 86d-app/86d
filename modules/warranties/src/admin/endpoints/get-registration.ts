import { createAdminEndpoint, z } from "@86d-app/core";
import type { WarrantyController } from "../../service";

export const getRegistration = createAdminEndpoint(
	"/admin/warranties/registrations/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.warranties as WarrantyController;
		const registration = await controller.getRegistration(ctx.params.id);
		if (!registration) {
			return { error: "Registration not found", status: 404 };
		}
		return { registration };
	},
);
