import type { ModuleController } from "@86d-app/core";

export interface ProductView {
	id: string;
	customerId?: string | undefined;
	sessionId?: string | undefined;
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	productPrice?: number | undefined;
	viewedAt: Date;
}

export interface PopularProduct {
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	viewCount: number;
}

export interface RecentlyViewedController extends ModuleController {
	trackView(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
		productId: string;
		productName: string;
		productSlug: string;
		productImage?: string | undefined;
		productPrice?: number | undefined;
	}): Promise<ProductView>;

	getRecentViews(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<ProductView[]>;

	getPopularProducts(params?: {
		take?: number | undefined;
	}): Promise<PopularProduct[]>;

	clearHistory(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
	}): Promise<number>;

	deleteView(id: string): Promise<boolean>;

	listAll(params?: {
		customerId?: string | undefined;
		productId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<ProductView[]>;

	countViews(params?: {
		customerId?: string | undefined;
		productId?: string | undefined;
	}): Promise<number>;

	mergeHistory(params: {
		sessionId: string;
		customerId: string;
	}): Promise<number>;
}
