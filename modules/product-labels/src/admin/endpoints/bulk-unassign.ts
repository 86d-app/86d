import { createAdminEndpoint, z } from "@86d-app/core";
import type { ProductLabelController } from "../../service";

export const bulkUnassign = createAdminEndpoint(
	"/admin/product-labels/bulk-unassign",
	{
		method: "POST",
		body: z.object({
			productIds: z.array(z.string()).min(1).max(500),
			labelId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productLabels as ProductLabelController;

		try {
			const removed = await controller.bulkUnassignLabel({
				productIds: ctx.body.productIds,
				labelId: ctx.body.labelId,
			});
			return { removed };
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to unassign labels";
			return { error: message, status: 400 };
		}
	},
);
