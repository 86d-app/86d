import { createAdminEndpoint } from "@86d-app/core";
import type { BulkPricingController } from "../../service";

export const deleteRule = createAdminEndpoint(
	"/admin/bulk-pricing/rules/:id/delete",
	{ method: "POST" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.bulkPricing as BulkPricingController;
		const deleted = await controller.deleteRule(ctx.params.id);
		return { deleted };
	},
);
