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
