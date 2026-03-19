import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CheckoutController, TaxCalculateController } from "../../service";

const addressSchema = z.object({
	firstName: z.string().min(1).max(200).transform(sanitizeText),
	lastName: z.string().min(1).max(200).transform(sanitizeText),
	company: z.string().max(200).transform(sanitizeText).optional(),
	line1: z.string().min(1).max(500).transform(sanitizeText),
	line2: z.string().max(500).transform(sanitizeText).optional(),
	city: z.string().min(1).max(200).transform(sanitizeText),
	state: z.string().min(1).max(200).transform(sanitizeText),
	postalCode: z.string().min(1).max(20),
	country: z.string().length(2),
	phone: z.string().max(50).transform(sanitizeText).optional(),
});

export const updateSession = createStoreEndpoint(
	"/checkout/sessions/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string().max(200) }),
		body: z.object({
			guestEmail: z.string().email().max(320).optional(),
			shippingAddress: addressSchema.optional(),
			billingAddress: addressSchema.optional(),
			shippingAmount: z.number().int().nonnegative().optional(),
			paymentMethod: z.string().max(100).transform(sanitizeText).optional(),
		}),
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

		let session = await controller.update(ctx.params.id, ctx.body);
		if (!session) {
			return { error: "Cannot update this checkout session", status: 422 };
		}

		// Auto-calculate tax when a shipping address is provided (or shipping changes)
		if (
			(ctx.body.shippingAddress || ctx.body.shippingAmount !== undefined) &&
			session.shippingAddress
		) {
			const taxController = ctx.context.controllers.tax as unknown as
				| TaxCalculateController
				| undefined;

			if (taxController?.calculate) {
				const lineItems = await controller.getLineItems(session.id);
				const taxResult = await taxController.calculate({
					address: {
						country: session.shippingAddress.country,
						state: session.shippingAddress.state,
						city: session.shippingAddress.city,
						postalCode: session.shippingAddress.postalCode,
					},
					lineItems: lineItems.map((item) => ({
						productId: item.productId,
						amount: item.price * item.quantity,
						quantity: item.quantity,
					})),
					shippingAmount: session.shippingAmount,
					customerId: session.customerId,
				});

				if (taxResult && typeof taxResult.totalTax === "number") {
					// Update session with calculated tax through the controller
					const updated = await controller.update(ctx.params.id, {
						taxAmount: taxResult.totalTax,
					});
					if (updated) {
						session = updated;
					}
				}
			}
		}

		return { session };
	},
);
