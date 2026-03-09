import { createStoreEndpoint, z } from "@86d-app/core";
import type { AuctionController } from "../../service";

export const buyNow = createStoreEndpoint(
	"/auctions/buy-now",
	{
		method: "POST",
		body: z.object({
			auctionId: z.string(),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user?.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.auctions as AuctionController;
		const auction = await controller.buyNow({
			auctionId: ctx.body.auctionId,
			customerId: userId,
		});

		return { auction };
	},
);
