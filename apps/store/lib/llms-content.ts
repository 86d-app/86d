/**
 * Fetches store data and renders comprehensive markdown for llms-full.txt.
 * Delegates pure rendering to lib/llms-content for testability.
 */

import type { LlmsFullContent } from "lib/llms-content";
import { renderLlmsFullMarkdown } from "lib/llms-content";
import { getBaseUrl } from "utils/url";
import {
	fetchBlogPostsForLlms,
	fetchCollectionsForLlms,
	fetchProductsForLlms,
	getStoreName,
} from "./seo";

export type { LlmsFullContent };

/**
 * Fetch all public store content for llms-full.txt.
 * Queries run in parallel for minimal latency.
 */
export async function fetchLlmsFullContent(): Promise<LlmsFullContent> {
	const [products, collections, blogPosts] = await Promise.all([
		fetchProductsForLlms(),
		fetchCollectionsForLlms(),
		fetchBlogPostsForLlms(),
	]);

	return { products, collections, blogPosts };
}

/**
 * Fetch content and render the full llms-full.txt markdown document.
 */
export async function generateLlmsFullMarkdown(): Promise<string> {
	const content = await fetchLlmsFullContent();
	return renderLlmsFullMarkdown(content, getStoreName(), getBaseUrl());
}
