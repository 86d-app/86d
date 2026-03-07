import { createAdminEndpoint, z } from "@86d-app/core";
import type { ReturnController } from "../../service";

export const approveReturn = createAdminEndpoint(
	"/admin/returns/:id/approve",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			adminNotes: z.string().max(2000).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.returns as ReturnController;
		const result = await controller.approve(ctx.params.id, ctx.body.adminNotes);
		if (!result) {
			return { error: "Return request not found", status: 404 };
		}
		return { return: result };
	},
);
