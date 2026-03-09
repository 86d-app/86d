import { createStoreEndpoint, z } from "@86d-app/core";
import type { StoreLocatorController } from "../../service";

export const listLocations = createStoreEndpoint(
	"/locations",
	{
		method: "GET",
		query: z
			.object({
				country: z.string().optional(),
				region: z.string().optional(),
				city: z.string().optional(),
				pickup: z.string().optional(),
				featured: z.string().optional(),
				limit: z.string().optional(),
				offset: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		const { query = {} } = ctx;
		const controller = ctx.context.controllers
			.storeLocator as StoreLocatorController;

		const locations = await controller.listLocations({
			activeOnly: true,
			country: query.country,
			region: query.region,
			city: query.city,
			pickupOnly: query.pickup === "true",
			featuredOnly: query.featured === "true",
			limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
			offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
		});

		return { locations };
	},
);
