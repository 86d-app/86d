import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const rejectConversionEndpoint = createAdminEndpoint(
	"/admin/affiliates/conversions/:id/reject",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const conversion = await controller.rejectConversion(ctx.body.id);
		if (!conversion) return { error: "Unable to reject conversion" };
		return { conversion };
	},
);
