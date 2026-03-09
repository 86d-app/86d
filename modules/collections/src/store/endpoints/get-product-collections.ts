import { createStoreEndpoint, z } from "@86d-app/core";
import type { CollectionController } from "../../service";

export const getProductCollections = createStoreEndpoint(
	"/collections/product/:productId",
	{
		method: "GET",
		params: z.object({
			productId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.collections as CollectionController;

		const collections = await controller.getCollectionsForProduct(
			ctx.params.productId,
		);

		return { collections };
	},
);
