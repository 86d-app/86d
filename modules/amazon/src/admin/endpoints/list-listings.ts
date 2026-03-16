import { createAdminEndpoint, z } from "@86d-app/core";
import type {
	AmazonController,
	FulfillmentChannel,
	ListingStatus,
} from "../../service";

export const listListingsEndpoint = createAdminEndpoint(
	"/admin/amazon/listings",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum(["active", "inactive", "suppressed", "incomplete"])
				.optional(),
			fulfillmentChannel: z.enum(["FBA", "FBM"]).optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.amazon as AmazonController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const listings = await controller.listListings({
			status: ctx.query.status as ListingStatus | undefined,
			fulfillmentChannel: ctx.query.fulfillmentChannel as
				| FulfillmentChannel
				| undefined,
			take: limit,
			skip,
		});
		return { listings, total: listings.length };
	},
);
