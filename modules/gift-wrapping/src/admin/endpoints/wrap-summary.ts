import { createAdminEndpoint } from "@86d-app/core";
import type { GiftWrappingController } from "../../service";

export const wrapSummary = createAdminEndpoint(
	"/admin/gift-wrapping/summary",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.giftWrapping as GiftWrappingController;
		const summary = await controller.getWrapSummary();
		return { summary };
	},
);
