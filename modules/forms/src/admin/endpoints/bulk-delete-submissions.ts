import { createAdminEndpoint, z } from "@86d-app/core";
import type { FormsController } from "../../service";

export const bulkDeleteSubmissions = createAdminEndpoint(
	"/admin/forms/submissions/bulk-delete",
	{
		method: "POST",
		body: z.object({
			ids: z.array(z.string()).min(1),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const deleted = await formsController.bulkDeleteSubmissions(ctx.body.ids);

		return { deleted };
	},
);
