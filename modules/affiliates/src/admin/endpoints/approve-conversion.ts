import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const approveConversionEndpoint = createAdminEndpoint(
	"/admin/affiliates/conversions/:id/approve",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const conversion = await controller.approveConversion(ctx.body.id);
		if (!conversion) return { error: "Unable to approve conversion" };
		return { conversion };
	},
);
