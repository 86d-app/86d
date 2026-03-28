import { createStoreEndpoint, z } from "@86d-app/core";
import type { CheckoutController, TaxCalculateController } from "../../service";
import { recalculateTax } from "./recalculate-tax";

export const removeDiscount = createStoreEndpoint(
	"/checkout/sessions/:id/discount/remove",
	{
		method: "DELETE",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const existing = await controller.getById(ctx.params.id);
		if (!existing) {
			return { error: "Checkout session not found", status: 404 };
		}

		// Ownership check
		const userId = ctx.context.session?.user.id;
		if (existing.customerId && (!userId || existing.customerId !== userId)) {
			return { error: "Checkout session not found", status: 404 };
		}

		let session = await controller.removeDiscount(ctx.params.id);
		if (!session) {
			return { error: "Cannot modify this checkout session", status: 422 };
		}

		// Recalculate tax now that discount is removed (taxable amount restored)
		const taxController = ctx.context.controllers.tax as unknown as
			| TaxCalculateController
			| undefined;
		session = await recalculateTax(session, controller, taxController);

		return { session };
	},
);
