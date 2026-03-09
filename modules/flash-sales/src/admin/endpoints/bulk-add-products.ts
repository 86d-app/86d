import { createAdminEndpoint, z } from "@86d-app/core";
import type { FlashSaleController } from "../../service";

export const bulkAddProducts = createAdminEndpoint(
	"/admin/flash-sales/:id/products/bulk",
	{
		method: "POST",
		params: z.object({
			id: z.string().min(1),
		}),
		body: z.object({
			products: z
				.array(
					z.object({
						productId: z.string().min(1),
						salePrice: z.number().min(0),
						originalPrice: z.number().min(0),
						stockLimit: z.number().int().min(1).optional(),
						sortOrder: z.number().int().min(0).optional(),
					}),
				)
				.min(1)
				.max(100),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.flashSales as FlashSaleController;

		const sale = await controller.getFlashSale(ctx.params.id);
		if (!sale) {
			return { error: "Flash sale not found", status: 404 };
		}

		const items = ctx.body.products.map((p) => {
			const item: Parameters<typeof controller.bulkAddProducts>[1][number] = {
				productId: p.productId,
				salePrice: p.salePrice,
				originalPrice: p.originalPrice,
			};
			if (p.stockLimit != null) item.stockLimit = p.stockLimit;
			if (p.sortOrder != null) item.sortOrder = p.sortOrder;
			return item;
		});

		const products = await controller.bulkAddProducts(ctx.params.id, items);

		return { products };
	},
);
