import type { ModuleController } from "@86d-app/core";

export type RecommendationStrategy =
	| "manual"
	| "bought_together"
	| "trending"
	| "personalized"
	| "ai_similar";

export type InteractionType = "view" | "purchase" | "add_to_cart";

export interface RecommendationRule {
	id: string;
	name: string;
	strategy: RecommendationStrategy;
	sourceProductId?: string | undefined;
	targetProductIds: string[];
	weight: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface CoOccurrence {
	id: string;
	productId1: string;
	productId2: string;
	count: number;
	lastOccurredAt: Date;
}

export interface ProductInteraction {
	id: string;
	productId: string;
	customerId?: string | undefined;
	sessionId?: string | undefined;
	type: InteractionType;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	productPrice?: number | undefined;
	productCategory?: string | undefined;
	createdAt: Date;
}

export interface ProductEmbedding {
	id: string;
	productId: string;
	embedding: number[];
	text: string;
	createdAt: Date;
}

export interface RecommendedProduct {
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	productPrice?: number | undefined;
	score: number;
	strategy: RecommendationStrategy;
}

export interface RecommendationController extends ModuleController {
	// --- Rules ---
	createRule(params: {
		name: string;
		strategy: RecommendationStrategy;
		sourceProductId?: string | undefined;
		targetProductIds: string[];
		weight?: number | undefined;
		isActive?: boolean | undefined;
	}): Promise<RecommendationRule>;

	updateRule(
		id: string,
		params: {
			name?: string | undefined;
			strategy?: RecommendationStrategy | undefined;
			sourceProductId?: string | undefined;
			targetProductIds?: string[] | undefined;
			weight?: number | undefined;
			isActive?: boolean | undefined;
		},
	): Promise<RecommendationRule | null>;

	deleteRule(id: string): Promise<boolean>;

	getRule(id: string): Promise<RecommendationRule | null>;

	listRules(params?: {
		strategy?: RecommendationStrategy | undefined;
		isActive?: boolean | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<RecommendationRule[]>;

	countRules(params?: {
		strategy?: RecommendationStrategy | undefined;
		isActive?: boolean | undefined;
	}): Promise<number>;

	// --- Co-occurrences ---
	recordPurchase(productIds: string[]): Promise<number>;

	getCoOccurrences(
		productId: string,
		params?: { take?: number | undefined },
	): Promise<CoOccurrence[]>;

	// --- Interactions ---
	trackInteraction(params: {
		productId: string;
		customerId?: string | undefined;
		sessionId?: string | undefined;
		type: InteractionType;
		productName: string;
		productSlug: string;
		productImage?: string | undefined;
		productPrice?: number | undefined;
		productCategory?: string | undefined;
	}): Promise<ProductInteraction>;

	// --- Recommendations ---
	getForProduct(
		productId: string,
		params?: {
			strategy?: RecommendationStrategy | undefined;
			take?: number | undefined;
		},
	): Promise<RecommendedProduct[]>;

	getTrending(params?: {
		take?: number | undefined;
		since?: Date | undefined;
	}): Promise<RecommendedProduct[]>;

	getPersonalized(
		customerId: string,
		params?: { take?: number | undefined },
	): Promise<RecommendedProduct[]>;

	// --- AI embeddings ---
	generateProductEmbedding(
		productId: string,
		text: string,
		metadata?: {
			productName?: string | undefined;
			productSlug?: string | undefined;
			productImage?: string | undefined;
			productPrice?: number | undefined;
		},
	): Promise<ProductEmbedding | null>;

	getAISimilar(
		productId: string,
		params?: { take?: number | undefined },
	): Promise<RecommendedProduct[]>;

	// --- Admin stats ---
	getStats(): Promise<{
		totalRules: number;
		activeRules: number;
		totalCoOccurrences: number;
		totalInteractions: number;
		embeddingsCount: number;
		aiConfigured: boolean;
	}>;
}
