import { createAdminEndpoint, z } from "@86d-app/core";

export const generateFeed = createAdminEndpoint(
	"/admin/product-feeds/:id/generate",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({}).strict(),
	},
	async () => {
		return {
			code: "PRODUCT_FEED_GENERATION_REVIEW_REQUIRED",
			error:
				"Product feed generation is unavailable until it reads an immutable published Catalog revision.",
			status: 503,
		};
	},
);
