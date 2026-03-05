import type { ModuleDataService } from "@86d-app/core";
import type { Cart, CartController, CartItem } from "./service";

export function createCartControllers(data: ModuleDataService): CartController {
	return {
		async getOrCreateCart(params) {
			const { customerId, guestId } = params;
			const cartId = customerId || guestId || crypto.randomUUID();

			// Try to get existing cart
			const existingCart = (await data.get("cart", cartId)) as Cart | null;

			if (existingCart) {
				return existingCart;
			}

			// Create new cart
			const cart: Cart = {
				id: cartId,
				customerId: customerId ?? undefined,
				guestId: guestId ?? undefined,
				status: "active",
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				metadata: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("cart", cartId, cart as Record<string, any>);

			return cart;
		},

		async getCartItems(cartId: string) {
			return (await data.findMany("cartItem", {
				where: { cartId },
			})) as CartItem[];
		},

		async getCartTotal(cartId: string) {
			const items = await this.getCartItems(cartId);
			return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
		},

		async isProductInActiveCart(productId: string) {
			const items = (await data.findMany("cartItem", {
				where: { productId },
			})) as CartItem[];

			// Check if any cart with this product is active
			for (const item of items) {
				const cart = (await data.get("cart", item.cartId)) as Cart | null;
				if (cart?.status === "active") {
					return true;
				}
			}

			return false;
		},

		async addItem(params) {
			const {
				cartId,
				productId,
				variantId,
				quantity,
				price,
				productName,
				productSlug,
				productImage,
				variantName,
				variantOptions,
			} = params;
			const itemId = variantId
				? `${cartId}_${productId}_${variantId}`
				: `${cartId}_${productId}`;

			const existing = (await data.get("cartItem", itemId)) as CartItem | null;
			const now = new Date();

			const item: CartItem = existing
				? {
						...existing,
						quantity: existing.quantity + quantity,
						updatedAt: now,
					}
				: {
						id: itemId,
						cartId,
						productId,
						variantId: variantId ?? undefined,
						quantity,
						price,
						productName,
						productSlug,
						productImage: productImage ?? undefined,
						variantName: variantName ?? undefined,
						variantOptions: variantOptions ?? undefined,
						metadata: {},
						createdAt: now,
						updatedAt: now,
					};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("cartItem", itemId, item as Record<string, any>);

			return item;
		},

		async updateItem(itemId: string, quantity: number) {
			// Get existing item
			const existingItem = (await data.get(
				"cartItem",
				itemId,
			)) as CartItem | null;

			if (!existingItem) {
				throw new Error(`Cart item ${itemId} not found`);
			}

			const updatedItem: CartItem = {
				...existingItem,
				quantity,
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("cartItem", itemId, updatedItem as Record<string, any>);

			return updatedItem;
		},

		async removeItem(itemId: string) {
			await data.delete("cartItem", itemId);
		},

		async clearCart(cartId: string) {
			const items = await this.getCartItems(cartId);

			for (const item of items) {
				await data.delete("cartItem", item.id);
			}
		},

		async getAbandonedCarts(opts = {}) {
			const { thresholdHours = 1, take = 50, skip = 0 } = opts;
			const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

			const allCarts = (await data.findMany("cart", {
				where: { status: "active" },
			})) as Cart[];

			// Filter to carts whose updatedAt is older than cutoff
			const stale = allCarts.filter(
				(c) => new Date(c.updatedAt).getTime() < cutoff.getTime(),
			);

			// Sort newest first and paginate
			stale.sort(
				(a, b) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
			);

			return stale.slice(skip, skip + take);
		},

		async markAsAbandoned(cartId: string) {
			const cart = (await data.get("cart", cartId)) as Cart | null;
			if (!cart) {
				throw new Error(`Cart ${cartId} not found`);
			}

			const updated: Cart = {
				...cart,
				status: "abandoned",
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("cart", cartId, updated as Record<string, any>);
			return updated;
		},

		async markRecoveryEmailSent(cartId: string) {
			const cart = (await data.get("cart", cartId)) as Cart | null;
			if (!cart) {
				throw new Error(`Cart ${cartId} not found`);
			}

			const meta = (cart.metadata ?? {}) as Record<string, unknown>;
			const prevCount =
				typeof meta.recoveryEmailCount === "number"
					? meta.recoveryEmailCount
					: 0;

			const updated: Cart = {
				...cart,
				metadata: {
					...meta,
					recoveryEmailSentAt: new Date().toISOString(),
					recoveryEmailCount: prevCount + 1,
				},
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("cart", cartId, updated as Record<string, any>);
			return updated;
		},

		async getRecoveryStats() {
			const allCarts = (await data.findMany("cart", {})) as Cart[];

			let totalAbandoned = 0;
			let recoverySent = 0;
			let recovered = 0;

			for (const cart of allCarts) {
				if (cart.status === "abandoned") {
					totalAbandoned++;
				}

				const meta = (cart.metadata ?? {}) as Record<string, unknown>;
				if (
					typeof meta.recoveryEmailCount === "number" &&
					meta.recoveryEmailCount > 0
				) {
					recoverySent++;
					// A cart that had recovery emails sent and was then converted
					if (cart.status === "converted") {
						recovered++;
					}
				}
			}

			return { totalAbandoned, recoverySent, recovered };
		},
	};
}
