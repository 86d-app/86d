import { getStoreConfig } from "@86d-app/sdk";
import { db } from "db";
import env from "env";
import { cache } from "react";
import { getBaseUrl } from "utils/url";
import { resolveTemplatePath } from "./template-path";

const getStoreConfigCached = cache(async () =>
	getStoreConfig({
		templatePath: resolveTemplatePath(),
		fallbackToTemplateOnError: true,
	}),
);

// biome-ignore lint/suspicious/noExplicitAny: ModuleData.data is JSONB
type JsonData = Record<string, any>;

interface ProductSeo {
	name: string;
	slug: string;
	description: string | null;
	shortDescription: string | null;
	price: number;
	compareAtPrice: number | null;
	images: string[];
	status: string;
	sku: string | null;
	updatedAt: string;
}

interface CollectionSeo {
	name: string;
	slug: string;
	description: string | null;
	image: string | null;
	updatedAt: string;
}

interface SitemapEntry {
	slug: string;
	updatedAt: Date;
}

/**
 * Resolve the products module DB ID for the current store.
 * Cached per request via React `cache()`.
 */
const getProductsModuleId = cache(async (): Promise<string | null> => {
	const storeId = env.STORE_ID;
	if (!storeId) return null;

	try {
		const mod = await db.module.findFirst({
			where: {
				storeId,
				name: "@86d-app/products",
			},
			select: { id: true },
		});
		return mod?.id ?? null;
	} catch {
		// DB unavailable (e.g. build time without DATABASE_URL)
		return null;
	}
});

/**
 * Fetch a single product by slug for metadata generation.
 */
export const fetchProductForSeo = cache(
	async (slug: string): Promise<ProductSeo | null> => {
		const moduleId = await getProductsModuleId();
		if (!moduleId) return null;

		const row = await db.moduleData.findFirst({
			where: {
				moduleId,
				entityType: "product",
				data: {
					path: ["slug"],
					equals: slug,
				},
			},
			select: { data: true, updatedAt: true },
		});

		if (!row?.data) return null;

		const d = row.data as JsonData;
		if (d.status !== "active") return null;

		return {
			name: d.name ?? "",
			slug: d.slug ?? slug,
			description: d.description ?? null,
			shortDescription: d.shortDescription ?? null,
			price: typeof d.price === "number" ? d.price : 0,
			compareAtPrice:
				typeof d.compareAtPrice === "number" ? d.compareAtPrice : null,
			images: Array.isArray(d.images) ? d.images : [],
			status: d.status ?? "draft",
			sku: d.sku ?? null,
			updatedAt: row.updatedAt.toISOString(),
		};
	},
);

/**
 * Fetch a single collection by slug for metadata generation.
 */
export const fetchCollectionForSeo = cache(
	async (slug: string): Promise<CollectionSeo | null> => {
		const moduleId = await getProductsModuleId();
		if (!moduleId) return null;

		const row = await db.moduleData.findFirst({
			where: {
				moduleId,
				entityType: "collection",
				data: {
					path: ["slug"],
					equals: slug,
				},
			},
			select: { data: true, updatedAt: true },
		});

		if (!row?.data) return null;

		const d = row.data as JsonData;
		if (d.isVisible === false) return null;

		return {
			name: d.name ?? "",
			slug: d.slug ?? slug,
			description: d.description ?? null,
			image: d.image ?? null,
			updatedAt: row.updatedAt.toISOString(),
		};
	},
);

/**
 * Resolve a module's DB ID for the current store by module name.
 * Cached per request via React `cache()`.
 */
const getModuleIdByName = cache(
	async (moduleName: string): Promise<string | null> => {
		const storeId = env.STORE_ID;
		if (!storeId) return null;

		try {
			const mod = await db.module.findFirst({
				where: {
					storeId,
					name: moduleName,
				},
				select: { id: true },
			});
			return mod?.id ?? null;
		} catch {
			// DB unavailable (e.g. build time without DATABASE_URL)
			return null;
		}
	},
);

/**
 * Fetch all active product slugs + updatedAt for the sitemap.
 */
export async function fetchProductSlugsForSitemap(): Promise<SitemapEntry[]> {
	const moduleId = await getProductsModuleId();
	if (!moduleId) return [];

	const rows = await db.moduleData.findMany({
		where: {
			moduleId,
			entityType: "product",
			data: {
				path: ["status"],
				equals: "active",
			},
		},
		select: { data: true, updatedAt: true },
	});

	return rows
		.filter((r) => r.data && (r.data as JsonData).slug)
		.map((r) => ({
			slug: (r.data as JsonData).slug as string,
			updatedAt: r.updatedAt,
		}));
}

/**
 * Fetch all visible collection slugs + updatedAt for the sitemap.
 */
export async function fetchCollectionSlugsForSitemap(): Promise<
	SitemapEntry[]
> {
	const moduleId = await getProductsModuleId();
	if (!moduleId) return [];

	const rows = await db.moduleData.findMany({
		where: {
			moduleId,
			entityType: "collection",
			data: {
				path: ["isVisible"],
				equals: true,
			},
		},
		select: { data: true, updatedAt: true },
	});

	return rows
		.filter((r) => r.data && (r.data as JsonData).slug)
		.map((r) => ({
			slug: (r.data as JsonData).slug as string,
			updatedAt: r.updatedAt,
		}));
}

/**
 * Get the store name from config (async).
 */
export async function getStoreName(): Promise<string> {
	try {
		const config = await getStoreConfigCached();
		return config.name ?? "86d Store";
	} catch {
		return "86d Store";
	}
}

/**
 * Build JSON-LD Product structured data.
 */
export function buildProductJsonLd(product: ProductSeo): object {
	const url = getBaseUrl();

	// biome-ignore lint/suspicious/noExplicitAny: JSON-LD schema.org structure
	const jsonLd: any = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: product.name,
		url: `${url}/products/${product.slug}`,
	};

	if (product.description) {
		jsonLd.description = product.description;
	}

	if (product.images.length > 0) {
		jsonLd.image = product.images;
	}

	if (product.sku) {
		jsonLd.sku = product.sku;
	}

	jsonLd.offers = {
		"@type": "Offer",
		url: `${url}/products/${product.slug}`,
		priceCurrency: "USD",
		price: product.price.toFixed(2),
		availability: "https://schema.org/InStock",
	};

	return jsonLd;
}

/**
 * Build JSON-LD CollectionPage structured data.
 */
export function buildCollectionJsonLd(collection: CollectionSeo): object {
	const url = getBaseUrl();

	// biome-ignore lint/suspicious/noExplicitAny: JSON-LD schema.org structure
	const jsonLd: any = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: collection.name,
		url: `${url}/collections/${collection.slug}`,
	};

	if (collection.description) {
		jsonLd.description = collection.description;
	}

	if (collection.image) {
		jsonLd.image = collection.image;
	}

	return jsonLd;
}

interface BlogPostSeo {
	title: string;
	slug: string;
	excerpt: string | null;
	coverImage: string | null;
	author: string | null;
	category: string | null;
	updatedAt: string;
}

/**
 * Fetch a single blog post by slug for metadata generation.
 */
export const fetchBlogPostForSeo = cache(
	async (slug: string): Promise<BlogPostSeo | null> => {
		const moduleId = await getModuleIdByName("@86d-app/blog");
		if (!moduleId) return null;

		const row = await db.moduleData.findFirst({
			where: {
				moduleId,
				entityType: "blogPost",
				data: {
					path: ["slug"],
					equals: slug,
				},
			},
			select: { data: true, updatedAt: true },
		});

		if (!row?.data) return null;

		const d = row.data as JsonData;
		if (d.status !== "published") return null;

		return {
			title: d.title ?? "",
			slug: d.slug ?? slug,
			excerpt: d.excerpt ?? null,
			coverImage: d.coverImage ?? null,
			author: d.author ?? null,
			category: d.category ?? null,
			updatedAt: row.updatedAt.toISOString(),
		};
	},
);

/**
 * Fetch all published blog post slugs + updatedAt for the sitemap.
 */
export async function fetchBlogPostSlugsForSitemap(): Promise<SitemapEntry[]> {
	const moduleId = await getModuleIdByName("@86d-app/blog");
	if (!moduleId) return [];

	const rows = await db.moduleData.findMany({
		where: {
			moduleId,
			entityType: "blogPost",
			data: {
				path: ["status"],
				equals: "published",
			},
		},
		select: { data: true, updatedAt: true },
	});

	return rows
		.filter((r) => r.data && (r.data as JsonData).slug)
		.map((r) => ({
			slug: (r.data as JsonData).slug as string,
			updatedAt: r.updatedAt,
		}));
}

// ── llms-full.txt content fetchers ──────────────────────────────────────────

export type {
	LlmsBlogPost,
	LlmsCollection,
	LlmsProduct,
} from "lib/llms-content";

/**
 * Fetch all active products for llms-full.txt.
 */
export async function fetchProductsForLlms(): Promise<
	import("lib/llms-content").LlmsProduct[]
> {
	const moduleId = await getProductsModuleId();
	if (!moduleId) return [];

	const rows = await db.moduleData.findMany({
		where: {
			moduleId,
			entityType: "product",
			data: { path: ["status"], equals: "active" },
		},
		orderBy: { createdAt: "desc" },
		take: 500,
		select: { data: true },
	});

	return rows
		.filter((r) => r.data && (r.data as JsonData).slug)
		.map((r) => {
			const d = r.data as JsonData;
			return {
				name: d.name ?? "",
				slug: d.slug as string,
				shortDescription: d.shortDescription ?? null,
				price: typeof d.price === "number" ? d.price : 0,
				images: Array.isArray(d.images) ? d.images : [],
			};
		});
}

/**
 * Fetch all visible collections for llms-full.txt.
 */
export async function fetchCollectionsForLlms(): Promise<
	import("lib/llms-content").LlmsCollection[]
> {
	const moduleId = await getProductsModuleId();
	if (!moduleId) return [];

	const rows = await db.moduleData.findMany({
		where: {
			moduleId,
			entityType: "collection",
			data: { path: ["isVisible"], equals: true },
		},
		orderBy: { createdAt: "asc" },
		take: 200,
		select: { data: true },
	});

	return rows
		.filter((r) => r.data && (r.data as JsonData).slug)
		.map((r) => {
			const d = r.data as JsonData;
			return {
				name: d.name ?? "",
				slug: d.slug as string,
				description: d.description ?? null,
			};
		});
}

/**
 * Fetch all published blog posts for llms-full.txt.
 */
export async function fetchBlogPostsForLlms(): Promise<
	import("lib/llms-content").LlmsBlogPost[]
> {
	const moduleId = await getModuleIdByName("@86d-app/blog");
	if (!moduleId) return [];

	const rows = await db.moduleData.findMany({
		where: {
			moduleId,
			entityType: "blogPost",
			data: { path: ["status"], equals: "published" },
		},
		orderBy: { createdAt: "desc" },
		take: 200,
		select: { data: true },
	});

	return rows
		.filter((r) => r.data && (r.data as JsonData).slug)
		.map((r) => {
			const d = r.data as JsonData;
			return {
				title: d.title ?? "",
				slug: d.slug as string,
				excerpt: d.excerpt ?? null,
				author: d.author ?? null,
				publishedAt: d.publishedAt
					? new Date(d.publishedAt).toISOString()
					: null,
			};
		});
}

/**
 * Build JSON-LD WebSite structured data for the root layout.
 */
export async function buildWebSiteJsonLd(): Promise<object> {
	const url = getBaseUrl();
	const storeName = await getStoreName();

	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: storeName,
		url,
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${url}/search?q={search_term_string}`,
			},
			"query-input": "required name=search_term_string",
		},
	};
}
