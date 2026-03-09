import { createAdminEndpoint, z } from "@86d-app/core";
import type { GiftWrappingController } from "../../service";

export const getOption = createAdminEndpoint(
	"/admin/gift-wrapping/:id",
	{
		method: "GET",
		params: z.object({
			id: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.giftWrapping as GiftWrappingController;
		const option = await controller.getOption(ctx.params.id);
		if (!option) {
			throw new Error("Wrap option not found");
		}
		return { option };
	},
);
