import { createAdminEndpoint } from "@86d-app/core";
import type { BulkPricingController } from "../../service";

export const getRule = createAdminEndpoint(
	"/admin/bulk-pricing/rules/:id",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.bulkPricing as BulkPricingController;
		const rule = await controller.getRule(ctx.params.id);
		return { rule };
	},
);
