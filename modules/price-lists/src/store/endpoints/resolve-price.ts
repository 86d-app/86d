import { createStoreEndpoint, z } from "@86d-app/core";
import type { PriceListController } from "../../service";

export const resolvePrice = createStoreEndpoint(
	"/prices/product/:productId",
	{
		method: "GET",
		params: z.object({
			productId: z.string().min(1).max(200),
		}),
		query: z.object({
			customerGroupId: z.string().max(200).optional(),
			quantity: z.coerce.number().int().min(1).optional(),
			currency: z.string().max(3).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.priceLists as PriceListController;

		const resolved = await controller.resolvePrice(ctx.params.productId, {
			...(ctx.query.customerGroupId != null && {
				customerGroupId: ctx.query.customerGroupId,
			}),
			...(ctx.query.quantity != null && { quantity: ctx.query.quantity }),
			...(ctx.query.currency != null && { currency: ctx.query.currency }),
		});

		return { price: resolved };
	},
);
