import { createAdminEndpoint } from "@86d-app/core";
import type { GiftCardController } from "../../service";

export const disableExpiredGiftCards = createAdminEndpoint(
	"/admin/gift-cards/disable-expired",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers.giftCards as GiftCardController;
		const count = await controller.disableExpired();
		return { disabledCount: count };
	},
);
