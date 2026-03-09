import { createAdminEndpoint, z } from "@86d-app/core";
import type { VendorController } from "../../service";

export const payoutStats = createAdminEndpoint(
	"/admin/vendors/payouts/stats",
	{
		method: "GET",
		query: z.object({
			vendorId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.vendors as VendorController;

		const stats = await controller.getPayoutStats(ctx.query.vendorId);

		return { stats };
	},
);
