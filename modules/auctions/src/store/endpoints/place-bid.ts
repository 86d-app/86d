import { createStoreEndpoint, z } from "@86d-app/core";
import type { AuctionController } from "../../service";

export const placeBid = createStoreEndpoint(
	"/auctions/bids/place",
	{
		method: "POST",
		body: z.object({
			auctionId: z.string(),
			amount: z.number().int().min(1),
			maxAutoBid: z.number().int().min(1).optional(),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user?.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.auctions as AuctionController;
		const result = await controller.placeBid({
			auctionId: ctx.body.auctionId,
			customerId: userId,
			customerName: ctx.context.session?.user?.name,
			amount: ctx.body.amount,
			maxAutoBid: ctx.body.maxAutoBid,
		});

		return { result };
	},
);
