import { createAdminEndpoint, z } from "@86d-app/core";
import type { BulkPricingController } from "../../service";

export const previewTiers = createAdminEndpoint(
	"/admin/bulk-pricing/rules/:id/preview",
	{
		method: "GET",
		query: z.object({
			basePrice: z.coerce.number().min(0),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.bulkPricing as BulkPricingController;
		const previews = await controller.previewTiers(
			ctx.params.id,
			ctx.query.basePrice,
		);
		return { tiers: previews };
	},
);
