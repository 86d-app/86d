import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";

export const storeSearch = createStoreEndpoint(
	"/digital-downloads/store-search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(0).max(500).transform(sanitizeText),
			limit: z.string().max(10).optional(),
		}),
	},
	async () => {
		return {
			results: [
				{
					id: "downloads",
					label: "Downloads",
					href: "/account/downloads",
					group: "Account",
				},
			],
		};
	},
);
