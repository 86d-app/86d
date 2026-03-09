import { createAdminEndpoint, z } from "@86d-app/core";
import type { FormsController } from "../../service";

export const getForm = createAdminEndpoint(
	"/admin/forms/:id",
	{
		method: "GET",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const form = await formsController.getForm(ctx.params.id);

		if (!form) {
			throw new Error(`Form ${ctx.params.id} not found`);
		}

		return { form };
	},
);
