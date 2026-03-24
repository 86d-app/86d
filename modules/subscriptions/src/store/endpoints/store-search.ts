import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";

export const storeSearch = createStoreEndpoint(
	"/subscriptions/store-search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(0).max(500).transform(sanitizeText),
			limit: z.coerce.number().int().min(1).max(50).optional(),
		}),
	},
	async () => {
		return {
			results: [
				{
					id: "subscriptions",
					label: "Subscriptions",
					href: "/account/subscriptions",
					group: "Account",
				},
			],
		};
	},
);
