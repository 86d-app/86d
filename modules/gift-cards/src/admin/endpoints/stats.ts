import { createAdminEndpoint } from "@86d-app/core";
import type { GiftCardController } from "../../service";

export const getGiftCardStats = createAdminEndpoint(
	"/admin/gift-cards/stats",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers.giftCards as GiftCardController;
		const stats = await controller.getStats();
		return { stats };
	},
);
