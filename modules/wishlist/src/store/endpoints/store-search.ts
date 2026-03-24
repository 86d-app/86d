import { createStoreEndpoint, z } from "@86d-app/core";

export const storeSearch = createStoreEndpoint(
	"/wishlist/store-search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(0).max(500),
			limit: z.string().max(10).optional(),
		}),
	},
	async () => {
		return {
			results: [
				{
					id: "wishlist",
					label: "Wishlist",
					href: "/account/wishlist",
					group: "Account",
				},
			],
		};
	},
);
