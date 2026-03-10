import { createAdminEndpoint } from "@86d-app/core";
import type { BulkPricingController } from "../../service";

export const getTier = createAdminEndpoint(
	"/admin/bulk-pricing/tiers/:id",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.bulkPricing as BulkPricingController;
		const tier = await controller.getTier(ctx.params.id);
		return { tier };
	},
);
