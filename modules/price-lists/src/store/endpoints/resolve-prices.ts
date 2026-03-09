import { createStoreEndpoint, z } from "@86d-app/core";
import type { PriceListController } from "../../service";

export const resolvePrices = createStoreEndpoint(
	"/prices/products",
	{
		method: "POST",
		body: z.object({
			productIds: z.array(z.string().min(1)).min(1).max(100),
			customerGroupId: z.string().optional(),
			quantity: z.number().int().min(1).optional(),
			currency: z.string().max(3).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.priceLists as PriceListController;

		const resolved = await controller.resolvePrices(ctx.body.productIds, {
			...(ctx.body.customerGroupId != null && {
				customerGroupId: ctx.body.customerGroupId,
			}),
			...(ctx.body.quantity != null && { quantity: ctx.body.quantity }),
			...(ctx.body.currency != null && { currency: ctx.body.currency }),
		});

		return { prices: resolved };
	},
);
