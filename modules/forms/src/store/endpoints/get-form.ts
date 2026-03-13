import { createStoreEndpoint, z } from "@86d-app/core";
import type { FormsController } from "../../service";

export const getForm = createStoreEndpoint(
	"/forms/:slug",
	{
		method: "GET",
		params: z.object({
			slug: z.string().max(200),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const form = await formsController.getFormBySlug(ctx.params.slug);

		if (!form || !form.isActive) {
			return { form: null };
		}

		return { form };
	},
);
