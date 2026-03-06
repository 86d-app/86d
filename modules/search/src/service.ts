import type { ModuleController } from "@86d-app/core";

export interface SearchIndexItem {
	id: string;
	entityType: string;
	entityId: string;
	title: string;
	body?: string | undefined;
	tags: string[];
	url: string;
	image?: string | undefined;
	metadata: Record<string, unknown>;
	indexedAt: Date;
}

export interface SearchQuery {
	id: string;
	term: string;
	normalizedTerm: string;
	resultCount: number;
	sessionId?: string | undefined;
	searchedAt: Date;
}

export interface SearchSynonym {
	id: string;
	term: string;
	synonyms: string[];
	createdAt: Date;
}

export interface SearchResult {
	item: SearchIndexItem;
	score: number;
}

export interface SearchAnalyticsSummary {
	totalQueries: number;
	uniqueTerms: number;
	avgResultCount: number;
	zeroResultCount: number;
	zeroResultRate: number;
}

export interface PopularTerm {
	term: string;
	count: number;
	avgResultCount: number;
}

export interface SearchController extends ModuleController {
	indexItem(params: {
		entityType: string;
		entityId: string;
		title: string;
		body?: string | undefined;
		tags?: string[] | undefined;
		url: string;
		image?: string | undefined;
		metadata?: Record<string, unknown> | undefined;
	}): Promise<SearchIndexItem>;

	removeFromIndex(entityType: string, entityId: string): Promise<boolean>;

	search(
		query: string,
		options?: {
			entityType?: string | undefined;
			limit?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<{ results: SearchResult[]; total: number }>;

	suggest(prefix: string, limit?: number): Promise<string[]>;

	recordQuery(
		term: string,
		resultCount: number,
		sessionId?: string | undefined,
	): Promise<SearchQuery>;

	getRecentQueries(sessionId: string, limit?: number): Promise<SearchQuery[]>;

	getPopularTerms(limit?: number): Promise<PopularTerm[]>;

	getZeroResultQueries(limit?: number): Promise<PopularTerm[]>;

	getAnalytics(): Promise<SearchAnalyticsSummary>;

	addSynonym(term: string, synonyms: string[]): Promise<SearchSynonym>;

	removeSynonym(id: string): Promise<boolean>;

	listSynonyms(): Promise<SearchSynonym[]>;

	getIndexCount(): Promise<number>;
}
