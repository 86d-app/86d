import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const reorder = createStoreEndpoint(
	"/orders/me/:id/reorder",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.order as OrderController;
		const order = await controller.getById(ctx.params.id);

		if (!order || order.customerId !== userId) {
			return { error: "Order not found", status: 404 };
		}

		const items = await controller.getReorderItems(ctx.params.id);
		if (!items || items.length === 0) {
			return { error: "No items to reorder", status: 422 };
		}

		// Enrich items with product slug and image from the products module
		const productsData = ctx.context._dataRegistry?.get("products");
		const enrichedItems = await Promise.all(
			items.map(async (item) => {
				let slug: string | undefined;
				let image: string | undefined;
				if (productsData) {
					const product = (await productsData.get(
						"product",
						item.productId,
					)) as { slug?: string; images?: string[] } | null;
					if (product) {
						slug = product.slug;
						image = product.images?.[0];
					}
				}
				return {
					...item,
					slug: slug ?? item.productId,
					image,
				};
			}),
		);

		return { items: enrichedItems };
	},
);
