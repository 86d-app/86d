import type { ModuleDataService } from "@86d-app/core";
import type {
	SearchClick,
	SearchController,
	SearchFacets,
	SearchHighlight,
	SearchIndexItem,
	SearchQuery,
	SearchResult,
	SearchSortField,
	SearchSynonym,
} from "./service";

function normalize(text: string): string {
	return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
	return normalize(text)
		.split(/[\s\-_/,.]+/)
		.filter((t) => t.length > 0);
}

/**
 * Levenshtein distance between two strings.
 * Used for fuzzy matching and did-you-mean suggestions.
 */
function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;

	// Use single-row optimization for space efficiency
	let prev = new Array<number>(n + 1);
	let curr = new Array<number>(n + 1);

	for (let j = 0; j <= n; j++) {
		prev[j] = j;
	}

	for (let i = 1; i <= m; i++) {
		curr[0] = i;
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(
				curr[j - 1] + 1, // insertion
				prev[j] + 1, // deletion
				prev[j - 1] + cost, // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}

	return prev[n];
}

/**
 * Returns maximum edit distance allowed for a given word length.
 * Shorter words get less tolerance to avoid noisy matches.
 */
function maxEditDistance(wordLength: number): number {
	if (wordLength <= 3) return 0;
	if (wordLength <= 5) return 1;
	return 2;
}

/**
 * Check if token fuzzy-matches the target within edit distance tolerance.
 */
function fuzzyMatch(token: string, target: string): boolean {
	const maxDist = maxEditDistance(token.length);
	if (maxDist === 0) return token === target;
	return levenshtein(token, target) <= maxDist;
}

/**
 * Highlight matching segments in text by wrapping in <mark> tags.
 */
function highlightText(
	text: string,
	queryTokens: string[],
	expandedTerms: Set<string>,
): string {
	if (!text || queryTokens.length === 0) return text;
	const allTerms = [...queryTokens, ...expandedTerms];
	let result = text;
	for (const term of allTerms) {
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(${escaped})`, "gi");
		result = result.replace(regex, "<mark>$1</mark>");
	}
	return result;
}

function scoreMatch(
	item: SearchIndexItem,
	queryTokens: string[],
	expandedTerms: Set<string>,
	fuzzy: boolean,
): number {
	let score = 0;
	const titleLower = normalize(item.title);
	const bodyLower = item.body ? normalize(item.body) : "";
	const tagLower = item.tags.map((t) => normalize(t));
	const titleTokens = tokenize(item.title);

	for (const token of queryTokens) {
		const allTerms = [token, ...expandedTerms];
		for (const term of allTerms) {
			// Exact title match is highest value
			if (titleLower === term) {
				score += 100;
			} else if (titleLower.startsWith(term)) {
				score += 50;
			} else if (titleLower.includes(term)) {
				score += 25;
			}

			// Body match
			if (bodyLower.includes(term)) {
				score += 10;
			}

			// Tag match
			for (const tag of tagLower) {
				if (tag === term) {
					score += 30;
				} else if (tag.includes(term)) {
					score += 15;
				}
			}
		}

		// Fuzzy matching on title tokens (lower weight than exact)
		if (fuzzy) {
			for (const titleToken of titleTokens) {
				const titleTokenNorm = normalize(titleToken);
				if (!titleLower.includes(token) && fuzzyMatch(token, titleTokenNorm)) {
					score += 15;
				}
			}
			// Fuzzy on tags
			for (const tag of tagLower) {
				const tagTokens = tokenize(tag);
				for (const tagToken of tagTokens) {
					if (!tag.includes(token) && fuzzyMatch(token, tagToken)) {
						score += 8;
					}
				}
			}
			// Fuzzy on body tokens
			if (bodyLower && !bodyLower.includes(token)) {
				const bodyTokens = tokenize(bodyLower);
				for (const bodyToken of bodyTokens) {
					if (fuzzyMatch(token, bodyToken)) {
						score += 5;
						break; // only count once per token per body
					}
				}
			}
		}
	}

	return score;
}

function computeFacets(items: SearchResult[]): SearchFacets {
	const typeCounts = new Map<string, number>();
	const tagCounts = new Map<string, number>();

	for (const { item } of items) {
		typeCounts.set(item.entityType, (typeCounts.get(item.entityType) ?? 0) + 1);
		for (const tag of item.tags) {
			const norm = normalize(tag);
			tagCounts.set(norm, (tagCounts.get(norm) ?? 0) + 1);
		}
	}

	return {
		entityTypes: Array.from(typeCounts.entries())
			.map(([type, count]) => ({ type, count }))
			.sort((a, b) => b.count - a.count),
		tags: Array.from(tagCounts.entries())
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 20),
	};
}

function sortResults(
	results: SearchResult[],
	sort: SearchSortField,
): SearchResult[] {
	const sorted = [...results];
	switch (sort) {
		case "newest":
			sorted.sort(
				(a, b) =>
					new Date(b.item.indexedAt).getTime() -
					new Date(a.item.indexedAt).getTime(),
			);
			break;
		case "oldest":
			sorted.sort(
				(a, b) =>
					new Date(a.item.indexedAt).getTime() -
					new Date(b.item.indexedAt).getTime(),
			);
			break;
		case "title_asc":
			sorted.sort((a, b) => a.item.title.localeCompare(b.item.title));
			break;
		case "title_desc":
			sorted.sort((a, b) => b.item.title.localeCompare(a.item.title));
			break;
		default:
			sorted.sort((a, b) => b.score - a.score);
			break;
	}
	return sorted;
}

/**
 * Find the closest known term to the query for did-you-mean suggestions.
 * Checks against indexed titles and popular search terms.
 */
function findDidYouMean(
	queryTokens: string[],
	indexedTitles: string[],
	popularTerms: string[],
	hasResults: boolean,
): string | undefined {
	// Only suggest corrections when results are few or none
	if (hasResults) return undefined;

	const candidates = new Set<string>();
	for (const title of indexedTitles) {
		for (const token of tokenize(title)) {
			candidates.add(token);
		}
	}
	for (const term of popularTerms) {
		for (const token of tokenize(term)) {
			candidates.add(token);
		}
	}

	const corrections: string[] = [];
	for (const token of queryTokens) {
		let bestMatch = token;
		let bestDist = Number.POSITIVE_INFINITY;

		for (const candidate of candidates) {
			if (candidate === token) {
				bestMatch = token;
				bestDist = 0;
				break;
			}
			const dist = levenshtein(token, candidate);
			const maxDist = maxEditDistance(token.length);
			if (maxDist > 0 && dist <= maxDist && dist < bestDist) {
				bestDist = dist;
				bestMatch = candidate;
			}
		}

		corrections.push(bestMatch);
	}

	const suggestion = corrections.join(" ");
	const original = queryTokens.join(" ");
	if (suggestion === original) return undefined;
	return suggestion;
}

export function createSearchController(
	data: ModuleDataService,
): SearchController {
	return {
		async indexItem(params) {
			const existing = await data.findMany("searchIndex", {
				where: {
					entityType: params.entityType,
					entityId: params.entityId,
				},
				take: 1,
			});
			const existingItems = existing as unknown as SearchIndexItem[];

			const id =
				existingItems.length > 0 ? existingItems[0].id : crypto.randomUUID();
			const item: SearchIndexItem = {
				id,
				entityType: params.entityType,
				entityId: params.entityId,
				title: params.title,
				body: params.body,
				tags: params.tags ?? [],
				url: params.url,
				image: params.image,
				metadata: params.metadata ?? {},
				indexedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("searchIndex", id, item as Record<string, any>);
			return item;
		},

		async bulkIndex(items) {
			let indexed = 0;
			let errors = 0;

			for (const params of items) {
				try {
					const existing = await data.findMany("searchIndex", {
						where: {
							entityType: params.entityType,
							entityId: params.entityId,
						},
						take: 1,
					});
					const existingItems = existing as unknown as SearchIndexItem[];
					const id =
						existingItems.length > 0
							? existingItems[0].id
							: crypto.randomUUID();

					const item: SearchIndexItem = {
						id,
						entityType: params.entityType,
						entityId: params.entityId,
						title: params.title,
						body: params.body,
						tags: params.tags ?? [],
						url: params.url,
						image: params.image,
						metadata: params.metadata ?? {},
						indexedAt: new Date(),
					};
					// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
					await data.upsert("searchIndex", id, item as Record<string, any>);
					indexed++;
				} catch {
					errors++;
				}
			}

			return { indexed, errors };
		},

		async removeFromIndex(entityType, entityId) {
			const items = await data.findMany("searchIndex", {
				where: { entityType, entityId },
			});
			const found = items as unknown as SearchIndexItem[];
			if (found.length === 0) return false;
			for (const item of found) {
				await data.delete("searchIndex", item.id);
			}
			return true;
		},

		async search(query, options) {
			const limit = options?.limit ?? 20;
			const skip = options?.skip ?? 0;
			const sort = options?.sort ?? "relevance";
			const fuzzy = options?.fuzzy ?? true;
			const queryTokens = tokenize(query);

			if (queryTokens.length === 0) {
				return {
					results: [],
					total: 0,
					facets: { entityTypes: [], tags: [] },
				};
			}

			// Load synonyms for query expansion
			const allSynonyms = (await data.findMany(
				"searchSynonym",
				{},
			)) as unknown as SearchSynonym[];
			const expandedTerms = new Set<string>();
			for (const syn of allSynonyms) {
				const synTermNorm = normalize(syn.term);
				for (const token of queryTokens) {
					if (token === synTermNorm) {
						for (const s of syn.synonyms) {
							expandedTerms.add(normalize(s));
						}
					}
					for (const s of syn.synonyms) {
						if (normalize(s) === token) {
							expandedTerms.add(synTermNorm);
						}
					}
				}
			}

			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (options?.entityType) {
				where.entityType = options.entityType;
			}

			const allItems = (await data.findMany("searchIndex", {
				...(Object.keys(where).length > 0 ? { where } : {}),
			})) as unknown as SearchIndexItem[];

			// Score and rank
			const scored: SearchResult[] = [];
			for (const item of allItems) {
				const score = scoreMatch(item, queryTokens, expandedTerms, fuzzy);
				if (score > 0) {
					const highlights: SearchHighlight = {
						title: highlightText(item.title, queryTokens, expandedTerms),
						body: item.body
							? highlightText(item.body, queryTokens, expandedTerms)
							: undefined,
					};
					scored.push({ item, score, highlights });
				}
			}

			// Filter by tags if specified
			let filtered = scored;
			if (options?.tags && options.tags.length > 0) {
				const filterTags = new Set(options.tags.map((t) => normalize(t)));
				filtered = scored.filter((r) =>
					r.item.tags.some((tag) => filterTags.has(normalize(tag))),
				);
			}

			// Compute facets before pagination
			const facets = computeFacets(filtered);

			// Sort
			const sorted = sortResults(filtered, sort);
			const total = sorted.length;
			const results = sorted.slice(skip, skip + limit);

			// Did-you-mean suggestion for zero/low results
			let didYouMean: string | undefined;
			if (total === 0) {
				const allTitles = allItems.map((i) => i.title);
				const allQueries = (await data.findMany(
					"searchQuery",
					{},
				)) as unknown as SearchQuery[];
				const popularTermsList = allQueries
					.filter((q) => q.resultCount > 0)
					.map((q) => q.term);
				didYouMean = findDidYouMean(
					queryTokens,
					allTitles,
					popularTermsList,
					false,
				);
			}

			return { results, total, facets, didYouMean };
		},

		async suggest(prefix, limit = 10) {
			const prefixNorm = normalize(prefix);
			if (prefixNorm.length === 0) return [];

			const allQueries = (await data.findMany(
				"searchQuery",
				{},
			)) as unknown as SearchQuery[];

			const termCounts = new Map<string, number>();
			for (const q of allQueries) {
				if (q.resultCount > 0 && q.normalizedTerm.startsWith(prefixNorm)) {
					termCounts.set(q.term, (termCounts.get(q.term) ?? 0) + 1);
				}
			}

			const allItems = (await data.findMany(
				"searchIndex",
				{},
			)) as unknown as SearchIndexItem[];
			const titleSuggestions: string[] = [];
			for (const item of allItems) {
				if (normalize(item.title).includes(prefixNorm)) {
					titleSuggestions.push(item.title);
				}
			}

			const popularTerms = Array.from(termCounts.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([term]) => term);

			const seen = new Set<string>();
			const suggestions: string[] = [];
			for (const term of popularTerms) {
				const norm = normalize(term);
				if (!seen.has(norm)) {
					seen.add(norm);
					suggestions.push(term);
				}
			}
			for (const title of titleSuggestions) {
				const norm = normalize(title);
				if (!seen.has(norm)) {
					seen.add(norm);
					suggestions.push(title);
				}
			}

			return suggestions.slice(0, limit);
		},

		async recordQuery(term, resultCount, sessionId) {
			const id = crypto.randomUUID();
			const query: SearchQuery = {
				id,
				term,
				normalizedTerm: normalize(term),
				resultCount,
				sessionId,
				searchedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("searchQuery", id, query as Record<string, any>);
			return query;
		},

		async recordClick(params) {
			const id = crypto.randomUUID();
			const click: SearchClick = {
				id,
				queryId: params.queryId,
				term: params.term,
				entityType: params.entityType,
				entityId: params.entityId,
				position: params.position,
				clickedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("searchClick", id, click as Record<string, any>);
			return click;
		},

		async getRecentQueries(sessionId, limit = 10) {
			const all = (await data.findMany("searchQuery", {
				where: { sessionId },
			})) as unknown as SearchQuery[];

			all.sort(
				(a, b) =>
					new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime(),
			);

			const seen = new Set<string>();
			const results: SearchQuery[] = [];
			for (const q of all) {
				if (!seen.has(q.normalizedTerm)) {
					seen.add(q.normalizedTerm);
					results.push(q);
				}
				if (results.length >= limit) break;
			}

			return results;
		},

		async getPopularTerms(limit = 20) {
			const all = (await data.findMany(
				"searchQuery",
				{},
			)) as unknown as SearchQuery[];

			const termStats = new Map<
				string,
				{ term: string; count: number; totalResults: number }
			>();
			for (const q of all) {
				const existing = termStats.get(q.normalizedTerm);
				if (existing) {
					existing.count += 1;
					existing.totalResults += q.resultCount;
				} else {
					termStats.set(q.normalizedTerm, {
						term: q.term,
						count: 1,
						totalResults: q.resultCount,
					});
				}
			}

			return Array.from(termStats.values())
				.map((s) => ({
					term: s.term,
					count: s.count,
					avgResultCount: Math.round(s.totalResults / s.count),
				}))
				.sort((a, b) => b.count - a.count)
				.slice(0, limit);
		},

		async getZeroResultQueries(limit = 20) {
			const all = (await data.findMany(
				"searchQuery",
				{},
			)) as unknown as SearchQuery[];

			const termStats = new Map<string, { term: string; count: number }>();
			for (const q of all) {
				if (q.resultCount === 0) {
					const existing = termStats.get(q.normalizedTerm);
					if (existing) {
						existing.count += 1;
					} else {
						termStats.set(q.normalizedTerm, {
							term: q.term,
							count: 1,
						});
					}
				}
			}

			return Array.from(termStats.values())
				.map((s) => ({
					term: s.term,
					count: s.count,
					avgResultCount: 0,
				}))
				.sort((a, b) => b.count - a.count)
				.slice(0, limit);
		},

		async getAnalytics() {
			const allQueries = (await data.findMany(
				"searchQuery",
				{},
			)) as unknown as SearchQuery[];

			const allClicks = (await data.findMany(
				"searchClick",
				{},
			)) as unknown as SearchClick[];

			if (allQueries.length === 0) {
				return {
					totalQueries: 0,
					uniqueTerms: 0,
					avgResultCount: 0,
					zeroResultCount: 0,
					zeroResultRate: 0,
					clickThroughRate: 0,
					avgClickPosition: 0,
				};
			}

			const uniqueTerms = new Set(allQueries.map((q) => q.normalizedTerm));
			const totalResults = allQueries.reduce(
				(sum, q) => sum + q.resultCount,
				0,
			);
			const zeroResultCount = allQueries.filter(
				(q) => q.resultCount === 0,
			).length;

			// CTR: queries that led to at least one click
			const clickedQueryIds = new Set(allClicks.map((c) => c.queryId));
			const queriesWithResults = allQueries.filter(
				(q) => q.resultCount > 0,
			).length;
			const clickThroughRate =
				queriesWithResults > 0
					? Math.round((clickedQueryIds.size / queriesWithResults) * 100)
					: 0;

			const avgClickPosition =
				allClicks.length > 0
					? Math.round(
							(allClicks.reduce((sum, c) => sum + c.position, 0) /
								allClicks.length) *
								10,
						) / 10
					: 0;

			return {
				totalQueries: allQueries.length,
				uniqueTerms: uniqueTerms.size,
				avgResultCount: Math.round(totalResults / allQueries.length),
				zeroResultCount,
				zeroResultRate: Math.round((zeroResultCount / allQueries.length) * 100),
				clickThroughRate,
				avgClickPosition,
			};
		},

		async addSynonym(term, synonyms) {
			const existing = await data.findMany("searchSynonym", {
				where: { term: normalize(term) },
				take: 1,
			});
			const existingItems = existing as unknown as SearchSynonym[];

			const id =
				existingItems.length > 0 ? existingItems[0].id : crypto.randomUUID();
			const synonym: SearchSynonym = {
				id,
				term: normalize(term),
				synonyms: synonyms.map((s) => s.trim()),
				createdAt:
					existingItems.length > 0 ? existingItems[0].createdAt : new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("searchSynonym", id, synonym as Record<string, any>);
			return synonym;
		},

		async removeSynonym(id) {
			const existing = await data.get("searchSynonym", id);
			if (!existing) return false;
			await data.delete("searchSynonym", id);
			return true;
		},

		async listSynonyms() {
			const all = (await data.findMany(
				"searchSynonym",
				{},
			)) as unknown as SearchSynonym[];
			return all;
		},

		async getIndexCount() {
			const all = await data.findMany("searchIndex", {});
			return all.length;
		},
	};
}
