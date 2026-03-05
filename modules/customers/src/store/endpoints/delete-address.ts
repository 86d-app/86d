import { createStoreEndpoint, z } from "@86d-app/core";
import type { CustomerController } from "../../service";

export const deleteAddress = createStoreEndpoint(
	"/customers/me/addresses/:id",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.customer as CustomerController;

		// Verify ownership
		const existing = await controller.getAddress(ctx.params.id);
		if (!existing || existing.customerId !== userId) {
			return { error: "Address not found", status: 404 };
		}

		await controller.deleteAddress(ctx.params.id);
		return { success: true };
	},
);
