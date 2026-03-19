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
			quantity: z.number().positive().int(),
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
