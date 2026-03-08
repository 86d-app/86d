import { createAdminEndpoint } from "@86d-app/core";
import type { ComparisonController } from "../../service";

export const deleteItem = createAdminEndpoint(
	"/admin/comparisons/:id/delete",
	{
		method: "DELETE",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.comparisons as ComparisonController;

		const deleted = await controller.deleteItem(ctx.params.id);

		if (!deleted) {
			return { error: "Comparison item not found", status: 404 };
		}

		return { success: true };
	},
);
