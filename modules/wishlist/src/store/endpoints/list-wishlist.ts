import { createStoreEndpoint, z } from "@86d-app/core";
import type { WishlistController } from "../../service";

export const listWishlist = createStoreEndpoint(
	"/wishlist",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.wishlist as WishlistController;
		const [items, count] = await Promise.all([
			controller.listByCustomer(ctx.query.customerId, {
				take: ctx.query.take ?? 50,
				skip: ctx.query.skip ?? 0,
			}),
			controller.countByCustomer(ctx.query.customerId),
		]);
		return { items, total: count };
	},
);
