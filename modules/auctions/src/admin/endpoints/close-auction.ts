import { createAdminEndpoint, z } from "@86d-app/core";
import type { AuctionController } from "../../service";

export const closeAuction = createAdminEndpoint(
	"/admin/auctions/:id/close",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.auctions as AuctionController;
		const auction = await controller.closeAuction(ctx.params.id);
		if (!auction) {
			return { error: "Auction not found", status: 404 };
		}
		return { auction };
	},
);
