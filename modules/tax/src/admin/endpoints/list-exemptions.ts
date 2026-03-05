import { createAdminEndpoint, z } from "@86d-app/core";
import type { TaxController } from "../../service";

export const adminListExemptions = createAdminEndpoint(
	"/admin/tax/exemptions",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tax as TaxController;
		const exemptions = await controller.listExemptions(ctx.query.customerId);
		return { exemptions };
	},
);
