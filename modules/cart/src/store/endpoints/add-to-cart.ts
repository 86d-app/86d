import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CartController } from "../../service";
import { resolveGuestId } from "./_guest";

export const addToCart = createStoreEndpoint(
	"/cart",
	{
		method: "POST",
		body: z.object({
			productId: z.string().max(200),
			variantId: z.string().max(200).optional(),
			quantity: z.number().positive().int().max(999),
			price: z.number().positive(),
			productName: z
				.string()
				.min(1)
				.max(500)
				.transform(sanitizeText)
				.refine((s) => s.length >= 1, "Product name is required"),
			productSlug: z
				.string()
				.min(1)
				.max(500)
				.transform(sanitizeText)
				.refine((s) => s.length >= 1, "Product slug is required"),
			productImage: z
				.string()
				.max(2000)
				.optional()
				.transform((s) => (s === undefined ? undefined : sanitizeText(s))),
			variantName: z
				.string()
				.max(500)
				.optional()
				.transform((s) => (s === undefined ? undefined : sanitizeText(s))),
			variantOptions: z
				.record(z.string().max(100), z.string().max(500))
				.refine((r) => Object.keys(r).length <= 50, "Too many variant options")
				.optional()
				.transform((rec) => {
					if (!rec) return undefined;
					const out: Record<string, string> = {};
					for (const [k, v] of Object.entries(rec)) {
						out[sanitizeText(k)] = sanitizeText(v);
					}
					return out;
				}),
		}),
	},
	async (ctx) => {
		const { body } = ctx;
		const context = ctx.context;
		const cartController = context.controllers.cart as CartController;

		// Server-side price validation: look up the real price from the products module
		const productsData = context._dataRegistry?.get("products");
		if (productsData) {
			let trustedPrice: number | undefined;
			if (body.variantId) {
				const variant = (await productsData.get(
					"productVariant",
					body.variantId,
				)) as { price: number } | null;
				if (variant) trustedPrice = variant.price;
			}
			if (trustedPrice === undefined) {
				const product = (await productsData.get("product", body.productId)) as {
					price: number;
					status: string;
				} | null;
				if (!product) {
					return { error: "Product not found", status: 404 };
				}
				if (product.status !== "active") {
					return { error: "Product is not available", status: 400 };
				}
				trustedPrice = product.price;
			}
			if (body.price !== trustedPrice) {
				body.price = trustedPrice;
			}
		}

		const customerId = context.session?.user.id;
		const cart = await cartController.getOrCreateCart(
			customerId ? { customerId } : { guestId: resolveGuestId(ctx) },
		);

		const item = await cartController.addItem({
			cartId: cart.id,
			productId: body.productId,
			...(body.variantId ? { variantId: body.variantId } : {}),
			quantity: body.quantity,
			price: body.price,
			productName: body.productName,
			productSlug: body.productSlug,
			productImage: body.productImage,
			variantName: body.variantName,
			variantOptions: body.variantOptions,
		});

		const items = await cartController.getCartItems(cart.id);

		return {
			cart,
			item,
			items,
			itemCount: items.length,
			subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
		};
	},
);
