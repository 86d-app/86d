import type { ModuleController } from "@86d-app/core";

export interface WishlistItem {
	id: string;
	customerId: string;
	productId: string;
	productName: string;
	productImage?: string | undefined;
	note?: string | undefined;
	addedAt: Date;
}

export interface WishlistSummary {
	totalItems: number;
	topProducts: Array<{ productId: string; productName: string; count: number }>;
}

export interface WishlistController extends ModuleController {
	addItem(params: {
		customerId: string;
		productId: string;
		productName: string;
		productImage?: string | undefined;
		note?: string | undefined;
	}): Promise<WishlistItem>;

	removeItem(id: string): Promise<boolean>;

	removeByProduct(customerId: string, productId: string): Promise<boolean>;

	getItem(id: string): Promise<WishlistItem | null>;

	isInWishlist(customerId: string, productId: string): Promise<boolean>;

	listByCustomer(
		customerId: string,
		params?: {
			take?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<WishlistItem[]>;

	listAll(params?: {
		customerId?: string | undefined;
		productId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<WishlistItem[]>;

	countByCustomer(customerId: string): Promise<number>;

	getSummary(): Promise<WishlistSummary>;
}
