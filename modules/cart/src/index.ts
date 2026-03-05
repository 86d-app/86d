import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { cartSchema } from "./schema";
import { createCartControllers } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

// Export service types for other modules to use
export type { Cart, CartController, CartItem } from "./service";

export interface CartOptions extends ModuleConfig {
	/**
	 * Guest cart expiration time in milliseconds
	 * @default 604800000 (7 days)
	 */
	guestCartExpiration?: number;
	/**
	 * Maximum items per cart
	 * @default 100
	 */
	maxItemsPerCart?: number;
}

/**
 * Cart module factory function
 * Creates a cart module with customer and admin endpoints
 */
export default function cart(options?: CartOptions): Module {
	return {
		id: "cart",
		version: "1.0.0",
		schema: cartSchema,
		exports: {
			read: ["cartItems", "cartTotal", "cartStatus"],
		},
		events: {
			emits: ["cart.updated", "cart.cleared", "cart.recovery.sent"],
		},

		/**
		 * Initialize and register controllers
		 */
		init: async (ctx: ModuleContext) => {
			const cartController = createCartControllers(ctx.data);

			return {
				controllers: { cart: cartController },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/carts",
					component: "CartList",
					label: "Carts",
					icon: "ShoppingCart",
					group: "Sales",
				},
				{
					path: "/admin/carts/abandoned",
					component: "AbandonedCarts",
					label: "Abandoned Carts",
					icon: "ShoppingCartSimple",
					group: "Sales",
				},
				{
					path: "/admin/carts/:id",
					component: "CartDetail",
				},
			],
		},
		options,
	};
}
