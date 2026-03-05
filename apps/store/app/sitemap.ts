import type { MetadataRoute } from "next";
import { getBaseUrl } from "utils/url";
import {
	fetchBlogPostSlugsForSitemap,
	fetchCollectionSlugsForSitemap,
	fetchProductSlugsForSitemap,
} from "../lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const url = getBaseUrl();

	const staticPages: MetadataRoute.Sitemap = [
		{ url, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
		{
			url: `${url}/products`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${url}/collections`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.8,
		},
		{
			url: `${url}/search`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.7,
		},
		{
			url: `${url}/about`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${url}/contact`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${url}/blog`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.6,
		},
		{
			url: `${url}/gift-cards`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${url}/terms`,
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 0.3,
		},
		{
			url: `${url}/privacy`,
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 0.3,
		},
	];

	// Fetch dynamic pages — gracefully degrade if DB unavailable
	let productPages: MetadataRoute.Sitemap = [];
	let collectionPages: MetadataRoute.Sitemap = [];
	let blogPages: MetadataRoute.Sitemap = [];

	try {
		const [products, collections, blogPosts] = await Promise.all([
			fetchProductSlugsForSitemap(),
			fetchCollectionSlugsForSitemap(),
			fetchBlogPostSlugsForSitemap(),
		]);

		productPages = products.map((p) => ({
			url: `${url}/products/${p.slug}`,
			lastModified: p.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.8,
		}));

		collectionPages = collections.map((c) => ({
			url: `${url}/collections/${c.slug}`,
			lastModified: c.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.7,
		}));

		blogPages = blogPosts.map((b) => ({
			url: `${url}/blog/${b.slug}`,
			lastModified: b.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.6,
		}));
	} catch {
		// DB not available (e.g., build time without DATABASE_URL) — skip dynamic pages
	}

	return [...staticPages, ...productPages, ...collectionPages, ...blogPages];
}
