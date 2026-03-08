/**
 * Input sanitization utilities for module authors.
 *
 * These functions are intentionally simple and dependency-free so they can
 * live inside @86d-app/core without pulling in external packages.
 */

/**
 * Strip HTML/XML tags from a string.
 * Removes `<script>` and `<style>` content entirely before stripping tags.
 */
export function stripTags(input: string): string {
	return input
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]*>/g, "");
}

/**
 * Collapse multiple whitespace characters into a single space and trim.
 */
export function normalizeWhitespace(input: string): string {
	return input.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize user-provided text for safe storage: strip HTML tags and
 * normalize whitespace. Use this on every user-facing text field
 * (names, descriptions, titles, bodies, etc.) before persisting.
 */
export function sanitizeText(input: string): string {
	return normalizeWhitespace(stripTags(input));
}

/**
 * Sanitize rich HTML content by removing dangerous elements while
 * preserving safe markup. Use this for fields that intentionally store
 * HTML (page content, rich-text editors) before rendering with
 * `dangerouslySetInnerHTML`.
 *
 * Removes: `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`,
 * `<form>`, event-handler attributes (`on*`), and `javascript:` URLs.
 */
export function sanitizeHtml(input: string): string {
	return (
		input
			// Remove dangerous tags and their content
			.replace(/<script[\s\S]*?<\/script>/gi, "")
			.replace(/<style[\s\S]*?<\/style>/gi, "")
			.replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
			.replace(/<iframe[^>]*\/?\s*>/gi, "")
			.replace(/<object[\s\S]*?<\/object>/gi, "")
			.replace(/<embed[^>]*\/?\s*>/gi, "")
			.replace(/<form[\s\S]*?<\/form>/gi, "")
			// Remove event-handler attributes (onclick, onerror, onload, etc.)
			.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
			// Remove javascript: URLs in href, src, action attributes
			.replace(
				/(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi,
				'$1=""',
			)
	);
}

/**
 * Escape a string for safe embedding inside a `<script>` tag.
 * Prevents script-tag breakout by encoding `</` and `<!--` sequences.
 * Use this when injecting JSON or data into inline `<script>` blocks.
 */
export function escapeScriptContent(input: string): string {
	return input.replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}
