import { createAdminEndpoint } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const getPolicy = createAdminEndpoint(
	"/admin/backorders/policies/:productId",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const policy = await controller.getPolicy(ctx.params.productId);
		if (!policy) {
			return { error: "Policy not found", policy: null };
		}
		return { policy };
	},
);
