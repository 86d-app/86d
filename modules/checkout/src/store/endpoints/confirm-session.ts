import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	CheckoutController,
	InventoryCheckController,
} from "../../service";

export const confirmSession = createStoreEndpoint(
	"/checkout/sessions/:id/confirm",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const existing = await controller.getById(ctx.params.id);
		if (!existing) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Ownership check
		const userId = ctx.context.session?.user.id;
		if (existing.customerId && userId && existing.customerId !== userId) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Check inventory availability before confirming (if inventory module installed)
		const inventoryController = ctx.context.controllers.inventory as unknown as
			| InventoryCheckController
			| undefined;

		if (inventoryController) {
			const lineItems = await controller.getLineItems(ctx.params.id);
			const outOfStock: string[] = [];

			for (const item of lineItems) {
				const inStock = await inventoryController.isInStock({
					productId: item.productId,
					variantId: item.variantId,
					quantity: item.quantity,
				});
				if (!inStock) {
					outOfStock.push(item.name);
				}
			}

			if (outOfStock.length > 0) {
				return {
					error: `Insufficient stock for: ${outOfStock.join(", ")}`,
					status: 422,
				};
			}
		}

		// Transition session to "processing"
		const result = await controller.confirm(ctx.params.id);
		if ("error" in result) {
			return result;
		}

		// Reserve stock for all line items
		if (inventoryController) {
			const lineItems = await controller.getLineItems(ctx.params.id);
			for (const item of lineItems) {
				await inventoryController.reserve({
					productId: item.productId,
					variantId: item.variantId,
					quantity: item.quantity,
				});
			}
		}

		return { session: result.session };
	},
);
