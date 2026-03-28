import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CheckoutController, TaxCalculateController } from "../../service";
import { recalculateTax } from "./recalculate-tax";

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
	phone: z
		.string()
		.max(50)
		.optional()
		.transform((s) => (s === undefined ? undefined : sanitizeText(s))),
});

export const createSession = createStoreEndpoint(
	"/checkout/sessions",
	{
		method: "POST",
		body: z.object({
			cartId: z.string().max(200).optional(),
			guestEmail: z.string().email().max(320).optional(),
			currency: z.string().length(3).optional(),
			subtotal: z.number().int().nonnegative(),
			taxAmount: z.number().int().nonnegative().optional(),
			shippingAmount: z.number().int().nonnegative().optional(),
			total: z.number().int().nonnegative(),
			lineItems: z
				.array(
					z.object({
						productId: z.string().max(200),
						variantId: z.string().max(200).optional(),
						name: z.string().min(1).max(500).transform(sanitizeText),
						sku: z
							.string()
							.max(100)
							.optional()
							.transform((s) =>
								s === undefined ? undefined : sanitizeText(s),
							),
						price: z.number().int().positive(),
						quantity: z.number().int().positive(),
					}),
				)
				.max(100),
			shippingAddress: addressSchema.optional(),
			billingAddress: addressSchema.optional(),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		const controller = ctx.context.controllers.checkout as CheckoutController;

		if (ctx.body.lineItems.length === 0) {
			return { error: "Cart is empty", status: 400 };
		}

		// Server-side price validation: override client prices with actual product prices
		const productsData = ctx.context._dataRegistry?.get("products");
		if (productsData) {
			for (const item of ctx.body.lineItems) {
				let trustedPrice: number | undefined;
				if (item.variantId) {
					const variant = (await productsData.get(
						"productVariant",
						item.variantId,
					)) as { price: number } | null;
					if (variant) trustedPrice = variant.price;
				}
				if (trustedPrice === undefined) {
					const product = (await productsData.get(
						"product",
						item.productId,
					)) as { price: number } | null;
					if (!product) {
						return {
							error: `Product not found: ${item.name}`,
							status: 400,
						};
					}
					trustedPrice = product.price;
				}
				item.price = trustedPrice;
			}
		}

		// Recalculate subtotal and total server-side from validated prices
		const subtotal = ctx.body.lineItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);
		const taxAmount = ctx.body.taxAmount ?? 0;
		const shippingAmount = ctx.body.shippingAmount ?? 0;
		const total = subtotal + taxAmount + shippingAmount;

		let session = await controller.create({
			...(ctx.body.cartId ? { cartId: ctx.body.cartId } : {}),
			...(customerId ? { customerId } : {}),
			...(ctx.body.guestEmail ? { guestEmail: ctx.body.guestEmail } : {}),
			...(ctx.body.currency ? { currency: ctx.body.currency } : {}),
			subtotal,
			...(ctx.body.taxAmount !== undefined
				? { taxAmount: ctx.body.taxAmount }
				: {}),
			...(ctx.body.shippingAmount !== undefined
				? { shippingAmount: ctx.body.shippingAmount }
				: {}),
			total,
			lineItems: ctx.body.lineItems,
			...(ctx.body.shippingAddress
				? { shippingAddress: ctx.body.shippingAddress }
				: {}),
			...(ctx.body.billingAddress
				? { billingAddress: ctx.body.billingAddress }
				: {}),
		});

		// Auto-calculate tax when a shipping address is provided
		if (ctx.body.shippingAddress && ctx.body.taxAmount === undefined) {
			const taxController = ctx.context.controllers.tax as unknown as
				| TaxCalculateController
				| undefined;
			session = await recalculateTax(session, controller, taxController);
		}

		return { session };
	},
);
