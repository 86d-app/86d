import { createAdminEndpoint, z } from "@86d-app/core";
import type { EtsyController, ListingStatus } from "../../service";

export const listListingsEndpoint = createAdminEndpoint(
	"/admin/etsy/listings",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum(["active", "draft", "expired", "inactive", "sold-out"])
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.etsy as EtsyController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const listings = await controller.listListings({
			status: ctx.query.status as ListingStatus | undefined,
			take: limit,
			skip,
		});
		return { listings, total: listings.length };
	},
);
