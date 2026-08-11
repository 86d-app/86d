import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type {
	CheckoutController,
	CurrencyConversionController,
	PriceListResolutionController,
	TaxCalculateController,
} from "../../service";

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

type AuthoritativeProduct = {
	id: string;
	name: string;
	price: number;
	sku?: string | undefined;
	status: string;
};

type AuthoritativeVariant = {
	id: string;
	productId: string;
	name: string;
	price: number;
	sku?: string | undefined;
};

function isAuthoritativeAmount(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) >= 0;
}

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

		if (
			ctx.body.taxAmount !== undefined ||
			ctx.body.shippingAmount !== undefined
		) {
			return {
				code: "CHECKOUT_CALLER_TOTALS_REJECTED",
				error:
					"Tax and shipping amounts must come from authoritative Store decisions.",
				status: 422,
			};
		}

		const productsData = ctx.context._dataRegistry?.get("products");
		if (!productsData) {
			return {
				code: "CHECKOUT_PRICING_UNAVAILABLE",
				error: "Authoritative product pricing is unavailable.",
				status: 503,
			};
		}

		const authoritativeLineItems = [];
		for (const item of ctx.body.lineItems) {
			const product = (await productsData.get(
				"product",
				item.productId,
			)) as AuthoritativeProduct | null;
			if (
				!product ||
				product.id !== item.productId ||
				product.status !== "active"
			) {
				return { error: "Product is not available", status: 400 };
			}
			if (!isAuthoritativeAmount(product.price)) {
				return {
					code: "CHECKOUT_PRICING_UNAVAILABLE",
					error: "Authoritative product pricing is unavailable.",
					status: 503,
				};
			}

			let name = product.name;
			let price = product.price;
			let sku = product.sku;
			if (item.variantId) {
				const variant = (await productsData.get(
					"productVariant",
					item.variantId,
				)) as AuthoritativeVariant | null;
				if (
					!variant ||
					variant.id !== item.variantId ||
					variant.productId !== product.id
				) {
					return { error: "Product variant is not available", status: 400 };
				}
				if (!isAuthoritativeAmount(variant.price)) {
					return {
						code: "CHECKOUT_PRICING_UNAVAILABLE",
						error: "Authoritative variant pricing is unavailable.",
						status: 503,
					};
				}
				name = `${product.name} - ${variant.name}`;
				price = variant.price;
				sku = variant.sku ?? product.sku;
			}

			authoritativeLineItems.push({
				productId: product.id,
				...(item.variantId ? { variantId: item.variantId } : {}),
				name,
				...(sku ? { sku } : {}),
				price,
				quantity: item.quantity,
			});
		}

		// Apply price list overrides when the price-lists module is active.
		// resolvePrices() returns only products covered by an active price list;
		// items absent from the map keep their base price (or get currency-converted below).
		const priceListCtrl = ctx.context.controllers.priceLists as unknown as
			| PriceListResolutionController
			| undefined;

		const priceListCoveredIds = new Set<string>();
		if (priceListCtrl) {
			const productIds = [
				...new Set(authoritativeLineItems.map((i) => i.productId)),
			];
			try {
				const resolved = await priceListCtrl.resolvePrices(productIds, {
					currency: ctx.body.currency,
				});
				for (const item of authoritativeLineItems) {
					const override = resolved[item.productId];
					if (override) {
						if (!isAuthoritativeAmount(override.price)) {
							return {
								code: "CHECKOUT_PRICING_UNAVAILABLE",
								error: "Authoritative price-list resolution is unavailable.",
								status: 503,
							};
						}
						item.price = override.price;
						priceListCoveredIds.add(item.productId);
					}
				}
			} catch {
				return {
					code: "CHECKOUT_PRICING_UNAVAILABLE",
					error: "Authoritative price-list resolution is unavailable.",
					status: 503,
				};
			}
		}

		// Apply currency conversion for items not already priced by a price list.
		// When a non-default currency is requested, convert base prices via exchange
		// rates (or price overrides set in the multi-currency module).
		if (ctx.body.currency) {
			const currencyCtrl = ctx.context.controllers.multiCurrency as unknown as
				| CurrencyConversionController
				| undefined;

			if (!currencyCtrl) {
				return {
					code: "CHECKOUT_PRICING_UNAVAILABLE",
					error: "Authoritative currency conversion is unavailable.",
					status: 503,
				};
			}

			for (const item of authoritativeLineItems) {
				if (priceListCoveredIds.has(item.productId)) continue;
				try {
					const converted = await currencyCtrl.getProductPrice({
						productId: item.productId,
						basePriceInCents: item.price,
						currencyCode: ctx.body.currency,
					});
					if (!converted || !isAuthoritativeAmount(converted.amount)) {
						return {
							code: "CHECKOUT_PRICING_UNAVAILABLE",
							error: "Authoritative currency conversion is unavailable.",
							status: 503,
						};
					}
					item.price = converted.amount;
				} catch {
					return {
						code: "CHECKOUT_PRICING_UNAVAILABLE",
						error: "Authoritative currency conversion is unavailable.",
						status: 503,
					};
				}
			}
		}

		// Recalculate subtotal and total server-side from validated prices
		const subtotal = authoritativeLineItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);
		let taxAmount = 0;
		const shippingAmount = 0;
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
				const taxResult = await taxController.calculate({
					address: {
						country: ctx.body.shippingAddress.country,
						state: ctx.body.shippingAddress.state,
						city: ctx.body.shippingAddress.city,
						postalCode: ctx.body.shippingAddress.postalCode,
					},
					lineItems: authoritativeLineItems.map((item) => ({
						productId: item.productId,
						amount: item.price * item.quantity,
						quantity: item.quantity,
					})),
					shippingAmount,
					customerId,
				});
				if (
					!taxResult ||
					!Number.isInteger(taxResult.totalTax) ||
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
		const total = subtotal + taxAmount + shippingAmount;

		const session = await controller.create({
			...(ctx.body.cartId ? { cartId: ctx.body.cartId } : {}),
			...(customerId ? { customerId } : {}),
			...(ctx.body.guestEmail ? { guestEmail: ctx.body.guestEmail } : {}),
			...(ctx.body.currency ? { currency: ctx.body.currency } : {}),
			subtotal,
			...(ctx.body.shippingAddress ? { taxAmount } : {}),
			total,
			lineItems: authoritativeLineItems,
			...(ctx.body.shippingAddress
				? { shippingAddress: ctx.body.shippingAddress }
				: {}),
			...(ctx.body.billingAddress
				? { billingAddress: ctx.body.billingAddress }
				: {}),
		});

		return { session };
	},
);
