import { createStoreEndpoint, z } from "@86d-app/core";

export const storeSearch = createStoreEndpoint(
	"/orders/store-search",
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
					id: "orders",
					label: "Orders",
					href: "/account/orders",
					group: "Account",
				},
			],
		};
	},
);
