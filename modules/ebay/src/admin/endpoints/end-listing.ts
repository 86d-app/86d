import { createAdminEndpoint, z } from "@86d-app/core";
import type { EbayController } from "../../service";

export const endListingEndpoint = createAdminEndpoint(
	"/admin/ebay/listings/:id/end",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.ebay as EbayController;
		const listing = await controller.endListing(ctx.params.id);
		return { listing };
	},
);
