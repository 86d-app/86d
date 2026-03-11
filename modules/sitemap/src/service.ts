import type { ModuleController } from "@86d-app/core";

export type ChangeFreq =
	| "always"
	| "hourly"
	| "daily"
	| "weekly"
	| "monthly"
	| "yearly"
	| "never";

export interface SitemapConfig {
	id: string;
	baseUrl: string;
	includeProducts: boolean;
	includeCollections: boolean;
	includePages: boolean;
	includeBlog: boolean;
	includeBrands: boolean;
	defaultChangeFreq: ChangeFreq;
	defaultPriority: number;
	productChangeFreq: ChangeFreq;
	productPriority: number;
	collectionChangeFreq: ChangeFreq;
	collectionPriority: number;
	pageChangeFreq: ChangeFreq;
	pagePriority: number;
	blogChangeFreq: ChangeFreq;
	blogPriority: number;
	excludedPaths?: string[];
	lastGenerated?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface SitemapEntry {
	id: string;
	/** Full URL */
	loc: string;
	lastmod?: Date;
	changefreq: ChangeFreq;
	priority: number;
	/** Source type: product, collection, page, blog, custom */
	source: string;
	/** ID of source record (if applicable) */
	sourceId?: string;
	createdAt: Date;
}

export interface SitemapStats {
	totalEntries: number;
	entriesBySource: Record<string, number>;
	lastGenerated?: Date;
}

export interface SitemapController extends ModuleController {
	getConfig(): Promise<SitemapConfig>;

	updateConfig(params: {
		baseUrl?: string;
		includeProducts?: boolean;
		includeCollections?: boolean;
		includePages?: boolean;
		includeBlog?: boolean;
		includeBrands?: boolean;
		defaultChangeFreq?: ChangeFreq;
		defaultPriority?: number;
		productChangeFreq?: ChangeFreq;
		productPriority?: number;
		collectionChangeFreq?: ChangeFreq;
		collectionPriority?: number;
		pageChangeFreq?: ChangeFreq;
		pagePriority?: number;
		blogChangeFreq?: ChangeFreq;
		blogPriority?: number;
		excludedPaths?: string[];
	}): Promise<SitemapConfig>;

	/**
	 * Add a custom sitemap entry (for pages not auto-discovered).
	 */
	addEntry(params: {
		path: string;
		changefreq?: ChangeFreq;
		priority?: number;
		lastmod?: Date;
	}): Promise<SitemapEntry>;

	/**
	 * Remove a custom sitemap entry.
	 */
	removeEntry(id: string): Promise<boolean>;

	/**
	 * List all entries (auto-generated + custom).
	 */
	listEntries(params?: {
		source?: string;
		take?: number;
		skip?: number;
	}): Promise<SitemapEntry[]>;

	/**
	 * Count entries.
	 */
	countEntries(source?: string): Promise<number>;

	/**
	 * Generate the sitemap XML string from entries.
	 */
	generateXml(): Promise<string>;

	/**
	 * Rebuild entries from configured sources.
	 * Called by admin "regenerate" action.
	 * Accepts external page data to build entries from.
	 */
	regenerate(pages: {
		products?: Array<{ slug: string; updatedAt?: Date }>;
		collections?: Array<{ slug: string; updatedAt?: Date }>;
		pages?: Array<{ slug: string; updatedAt?: Date }>;
		blog?: Array<{ slug: string; updatedAt?: Date }>;
		brands?: Array<{ slug: string; updatedAt?: Date }>;
	}): Promise<number>;

	getStats(): Promise<SitemapStats>;
}
