import {
	createAdminEndpoint,
	inventoryCheckoutCapability,
	z,
} from "@86d-app/core";
import type { ReturnController } from "../../service";

export const markReceived = createAdminEndpoint(
	"/admin/returns/:id/received",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.returns as ReturnController;
		const returnWithItems = await controller.getById(ctx.params.id);
		if (!returnWithItems) {
			return { error: "Return request not found", status: 404 };
		}

		const result = await controller.markReceived(ctx.params.id);
		if (!result) {
			return { error: "Return request not found", status: 404 };
		}

		// Restock inventory for items that carry productId (best-effort).
		// Items without productId were submitted before this field was added and
		// cannot be automatically restocked — the admin must adjust manually.
		for (const item of returnWithItems.items) {
			if (!item.productId) continue;
			try {
				await ctx.context.capabilities.invoke(inventoryCheckoutCapability, {
					operation: "adjust",
					productId: item.productId,
					variantId: item.variantId,
					delta: item.quantity,
				});
			} catch {
				// Best-effort: inventory restock failure never blocks the return
			}
		}

		void ctx.context.events?.emit("return.received", {
			returnId: result.id,
			orderId: result.orderId,
			orderNumber: result.orderId,
			email: result.customerEmail ?? "",
			customerName: "",
		});
		return { return: result };
	},
);
