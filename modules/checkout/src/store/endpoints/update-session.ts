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
	"/checkout/sessions/:id/update",
	{
		method: "PUT",
		params: z.object({ id: z.string().max(200) }),
		body: z.object({
			guestEmail: z.string().email().max(320).optional(),
			shippingAddress: addressSchema.optional(),
			billingAddress: addressSchema.optional(),
			shippingAmount: z.number().int().nonnegative().optional(),
			shippingMethodName: z
				.string()
				.max(200)
				.transform(sanitizeText)
				.optional(),
			paymentMethod: z.string().max(100).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		if (ctx.body.shippingAmount !== undefined) {
			return {
				code: "CHECKOUT_CALLER_TOTALS_REJECTED",
				error:
					"Shipping amounts must come from an authoritative Store decision.",
				status: 422,
			};
		}

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

		let taxAmount: number | undefined;
		if (ctx.body.shippingAddress) {
			const taxController = ctx.context.controllers.tax as unknown as
				| TaxCalculateController
				| undefined;
			if (!taxController?.calculate) {
				return {
					code: "CHECKOUT_TAX_UNAVAILABLE",
					error: "An authoritative tax decision is unavailable.",
					status: 503,
				};
			}

			try {
				const lineItems = await controller.getLineItems(existing.id);
				if (lineItems.length === 0) {
					return {
						code: "CHECKOUT_TAX_UNAVAILABLE",
						error: "An authoritative tax decision is unavailable.",
						status: 503,
					};
				}
				const discountRatio =
					existing.subtotal > 0 && existing.discountAmount > 0
						? existing.discountAmount / existing.subtotal
						: 0;
				const taxResult = await taxController.calculate({
					address: {
						country: ctx.body.shippingAddress.country,
						state: ctx.body.shippingAddress.state,
						city: ctx.body.shippingAddress.city,
						postalCode: ctx.body.shippingAddress.postalCode,
					},
					lineItems: lineItems.map((item) => ({
						productId: item.productId,
						amount: Math.round(
							item.price * item.quantity * (1 - discountRatio),
						),
						quantity: item.quantity,
					})),
					shippingAmount: existing.shippingAmount,
					customerId: existing.customerId,
				});
				if (
					!taxResult ||
					!Number.isSafeInteger(taxResult.totalTax) ||
					taxResult.totalTax < 0
				) {
					return {
						code: "CHECKOUT_TAX_UNAVAILABLE",
						error: "An authoritative tax decision is unavailable.",
						status: 503,
					};
				}
				taxAmount = taxResult.totalTax;
			} catch {
				return {
					code: "CHECKOUT_TAX_UNAVAILABLE",
					error: "An authoritative tax decision is unavailable.",
					status: 503,
				};
			}
		}

		const session = await controller.update(ctx.params.id, {
			...ctx.body,
			...(taxAmount !== undefined ? { taxAmount } : {}),
		});
		if (!session) {
			return { error: "Cannot update this checkout session", status: 422 };
		}

		return { session };
	},
);
