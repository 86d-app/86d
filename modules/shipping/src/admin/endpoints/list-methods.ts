import { createAdminEndpoint, z } from "@86d-app/core";
import type { ShippingController } from "../../service";

export const listMethods = createAdminEndpoint(
	"/admin/shipping/methods",
	{
		method: "GET",
		query: z.object({
			activeOnly: z
				.string()
				.optional()
				.transform((v) => v === "true"),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.shipping as ShippingController;
		const methods = await controller.listMethods({
			activeOnly: ctx.query.activeOnly,
		});
		return { methods };
	},
);
