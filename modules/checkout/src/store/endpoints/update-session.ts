import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CheckoutController } from "../../service";

const addressSchema = z.object({
	firstName: z.string().min(1).max(200).transform(sanitizeText),
	lastName: z.string().min(1).max(200).transform(sanitizeText),
	company: z.string().max(200).transform(sanitizeText).optional(),
	line1: z.string().min(1).max(500).transform(sanitizeText),
	line2: z.string().max(500).transform(sanitizeText).optional(),
	city: z.string().min(1).max(200).transform(sanitizeText),
	state: z.string().min(1).max(200).transform(sanitizeText),
	postalCode: z.string().min(1),
	country: z.string().length(2),
	phone: z.string().optional(),
});

export const updateSession = createStoreEndpoint(
	"/checkout/sessions/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
		body: z.object({
			guestEmail: z.string().email().optional(),
			shippingAddress: addressSchema.optional(),
			billingAddress: addressSchema.optional(),
			shippingAmount: z.number().int().nonnegative().optional(),
			paymentMethod: z.string().optional(),
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
		if (existing.customerId && userId && existing.customerId !== userId) {
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
			// biome-ignore lint/suspicious/noExplicitAny: optional tax controller
			const taxController = ctx.context.controllers.tax as any;
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
					// Update session with calculated tax — recalculate total
					const taxAmount = taxResult.totalTax;
					const total =
						session.subtotal +
						taxAmount +
						session.shippingAmount -
						session.discountAmount -
						session.giftCardAmount;

					// biome-ignore lint/suspicious/noExplicitAny: data service direct update
					const data = ctx.context.data as any;
					if (data?.upsert) {
						const updated = {
							...session,
							taxAmount,
							total: Math.max(0, total),
							updatedAt: new Date(),
						};
						await data.upsert(
							"checkoutSession",
							session.id,
							// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
							updated as any,
						);
						session = updated;
					}
				}
			}
		}

		return { session };
	},
);
