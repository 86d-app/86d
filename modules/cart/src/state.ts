import { makeAutoObservable } from "@86d-app/core/state";

/**
 * Cart UI state — shared across components via MobX.
 * Replaces window.CustomEvent("cart-toggle" | "cart-open" | "cart-updated").
 */
export const cartState = makeAutoObservable({
	isDrawerOpen: false,
	itemCount: 0,

	toggleDrawer() {
		this.isDrawerOpen = !this.isDrawerOpen;
	},

	openDrawer() {
		this.isDrawerOpen = true;
	},

	closeDrawer() {
		this.isDrawerOpen = false;
	},

	setItemCount(n: number) {
		this.itemCount = n;
	},
});

export type CartState = typeof cartState;
