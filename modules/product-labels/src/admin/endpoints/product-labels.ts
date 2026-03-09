import { createAdminEndpoint, z } from "@86d-app/core";
import type { ProductLabelController } from "../../service";

export const adminProductLabels = createAdminEndpoint(
	"/admin/product-labels/products/:productId",
	{
		method: "GET",
		params: z.object({
			productId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productLabels as ProductLabelController;

		const result = await controller.getProductLabels(ctx.params.productId);
		return result;
	},
);
