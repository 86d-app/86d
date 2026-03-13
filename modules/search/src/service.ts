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

export interface SearchClick {
	id: string;
	queryId: string;
	term: string;
	entityType: string;
	entityId: string;
	position: number;
	clickedAt: Date;
}

export type SearchSortField =
	| "relevance"
	| "newest"
	| "oldest"
	| "title_asc"
	| "title_desc";

export interface SearchFacets {
	entityTypes: Array<{ type: string; count: number }>;
	tags: Array<{ tag: string; count: number }>;
}

export interface SearchResult {
	item: SearchIndexItem;
	score: number;
	highlights?: SearchHighlight | undefined;
}

export interface SearchHighlight {
	title?: string | undefined;
	body?: string | undefined;
}

export interface SearchAnalyticsSummary {
	totalQueries: number;
	uniqueTerms: number;
	avgResultCount: number;
	zeroResultCount: number;
	zeroResultRate: number;
	clickThroughRate: number;
	avgClickPosition: number;
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

	bulkIndex(
		items: Array<{
			entityType: string;
			entityId: string;
			title: string;
			body?: string | undefined;
			tags?: string[] | undefined;
			url: string;
			image?: string | undefined;
			metadata?: Record<string, unknown> | undefined;
		}>,
	): Promise<{ indexed: number; errors: number }>;

	removeFromIndex(entityType: string, entityId: string): Promise<boolean>;

	search(
		query: string,
		options?: {
			entityType?: string | undefined;
			tags?: string[] | undefined;
			sort?: SearchSortField | undefined;
			fuzzy?: boolean | undefined;
			limit?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<{
		results: SearchResult[];
		total: number;
		facets: SearchFacets;
		didYouMean?: string | undefined;
	}>;

	suggest(prefix: string, limit?: number): Promise<string[]>;

	recordQuery(
		term: string,
		resultCount: number,
		sessionId?: string | undefined,
	): Promise<SearchQuery>;

	recordClick(params: {
		queryId: string;
		term: string;
		entityType: string;
		entityId: string;
		position: number;
	}): Promise<SearchClick>;

	getRecentQueries(sessionId: string, limit?: number): Promise<SearchQuery[]>;

	getPopularTerms(limit?: number): Promise<PopularTerm[]>;

	getZeroResultQueries(limit?: number): Promise<PopularTerm[]>;

	getAnalytics(): Promise<SearchAnalyticsSummary>;

	addSynonym(term: string, synonyms: string[]): Promise<SearchSynonym>;

	removeSynonym(id: string): Promise<boolean>;

	listSynonyms(): Promise<SearchSynonym[]>;

	getIndexCount(): Promise<number>;
}
