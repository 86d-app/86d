import { createAdminEndpoint, z } from "@86d-app/core";
import type { DiscountController } from "../../service";

export const adminDeleteCode = createAdminEndpoint(
	"/admin/discounts/codes/:id/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.discount as DiscountController;
		await controller.deleteCode(ctx.params.id);
		return { success: true };
	},
);
