import { createStoreEndpoint, z } from "@86d-app/core";
import { checkoutRevisionSchema, runCheckoutMutation } from "../../concurrency";
import type { CheckoutController } from "../../service";
import { canAccessCheckout } from "./guest-proof";
import { recalculateTax } from "./recalculate-tax";

export const removeDiscount = createStoreEndpoint(
	"/checkout/sessions/:id/discount/remove",
	{
		method: "DELETE",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({ expectedRevision: checkoutRevisionSchema }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.checkout as CheckoutController;
		const existing = await controller.getById(ctx.params.id);
		if (!existing) {
			return { error: "Checkout session not found", status: 404 };
		}

		if (!(await canAccessCheckout(ctx, existing))) {
			return { error: "Checkout session not found", status: 404 };
		}

		const mutation = await runCheckoutMutation(() =>
			controller.removeDiscount(ctx.params.id, ctx.body.expectedRevision),
		);
		if (!mutation.ok) return mutation.response;
		let session = mutation.value;
		if (!session) {
			return { error: "Cannot modify this checkout session", status: 422 };
		}

		// Recalculate tax now that discount is removed (taxable amount restored)
		session = await recalculateTax(
			session,
			controller,
			ctx.context.capabilities,
		);
		if (!session) {
			return {
				code: "CHECKOUT_TAX_UNAVAILABLE",
				error: "An authoritative tax decision is unavailable.",
				status: 503,
			};
		}

		return { session };
	},
);
