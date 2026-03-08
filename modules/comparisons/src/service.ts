import type { ModuleController } from "@86d-app/core";

export interface ComparisonItem {
	id: string;
	customerId?: string | undefined;
	sessionId?: string | undefined;
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	productPrice?: number | undefined;
	productCategory?: string | undefined;
	attributes?: Record<string, string> | undefined;
	addedAt: Date;
}

export interface FrequentlyCompared {
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	compareCount: number;
}

export interface ComparisonController extends ModuleController {
	addProduct(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
		productId: string;
		productName: string;
		productSlug: string;
		productImage?: string | undefined;
		productPrice?: number | undefined;
		productCategory?: string | undefined;
		attributes?: Record<string, string> | undefined;
		maxProducts?: number | undefined;
	}): Promise<ComparisonItem>;

	removeProduct(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
		productId: string;
	}): Promise<boolean>;

	getComparison(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
	}): Promise<ComparisonItem[]>;

	clearComparison(params: {
		customerId?: string | undefined;
		sessionId?: string | undefined;
	}): Promise<number>;

	mergeComparison(params: {
		sessionId: string;
		customerId: string;
		maxProducts?: number | undefined;
	}): Promise<number>;

	deleteItem(id: string): Promise<boolean>;

	listAll(params?: {
		customerId?: string | undefined;
		productId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<ComparisonItem[]>;

	countItems(params?: {
		customerId?: string | undefined;
		productId?: string | undefined;
	}): Promise<number>;

	getFrequentlyCompared(params?: {
		take?: number | undefined;
	}): Promise<FrequentlyCompared[]>;
}
