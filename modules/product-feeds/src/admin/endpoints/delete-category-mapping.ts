import { createAdminEndpoint } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

export const deleteCategoryMapping = createAdminEndpoint(
	"/admin/product-feeds/:id/mappings/:mappingId/delete",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;

		const deleted = await controller.deleteCategoryMapping(
			ctx.params.mappingId,
		);
		if (!deleted) {
			return { error: "Mapping not found" };
		}

		return { success: true };
	},
);
