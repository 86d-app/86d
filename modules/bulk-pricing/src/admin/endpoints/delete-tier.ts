import { createAdminEndpoint } from "@86d-app/core";
import type { BulkPricingController } from "../../service";

export const deleteTier = createAdminEndpoint(
	"/admin/bulk-pricing/tiers/:id/delete",
	{ method: "POST" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.bulkPricing as BulkPricingController;
		const deleted = await controller.deleteTier(ctx.params.id);
		return { deleted };
	},
);
