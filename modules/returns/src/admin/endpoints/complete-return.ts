import { createAdminEndpoint, z } from "@86d-app/core";
import type { ReturnController } from "../../service";

export const completeReturn = createAdminEndpoint(
	"/admin/returns/:id/complete",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			refundAmount: z.number().min(0),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.returns as ReturnController;
		const result = await controller.complete(
			ctx.params.id,
			ctx.body.refundAmount,
		);
		if (!result) {
			return { error: "Return request not found", status: 404 };
		}
		return { return: result };
	},
);
