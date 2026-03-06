import type { ModuleDataService } from "@86d-app/core";
import type {
	SearchController,
	SearchIndexItem,
	SearchQuery,
	SearchResult,
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

function scoreMatch(
	item: SearchIndexItem,
	queryTokens: string[],
	expandedTerms: Set<string>,
): number {
	let score = 0;
	const titleLower = normalize(item.title);
	const bodyLower = item.body ? normalize(item.body) : "";
	const tagLower = item.tags.map((t) => normalize(t));

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
	}

	return score;
}

export function createSearchController(
	data: ModuleDataService,
): SearchController {
	return {
		async indexItem(params) {
			// Check if already indexed — update if so
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
			const queryTokens = tokenize(query);

			if (queryTokens.length === 0) {
				return { results: [], total: 0 };
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
					// Also reverse: if a query token matches a synonym, expand to the term
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
				const score = scoreMatch(item, queryTokens, expandedTerms);
				if (score > 0) {
					scored.push({ item, score });
				}
			}

			scored.sort((a, b) => b.score - a.score);
			const total = scored.length;
			const results = scored.slice(skip, skip + limit);

			return { results, total };
		},

		async suggest(prefix, limit = 10) {
			const prefixNorm = normalize(prefix);
			if (prefixNorm.length === 0) return [];

			// Combine popular terms + index titles
			const allQueries = (await data.findMany(
				"searchQuery",
				{},
			)) as unknown as SearchQuery[];

			// Count query frequency
			const termCounts = new Map<string, number>();
			for (const q of allQueries) {
				if (q.resultCount > 0 && q.normalizedTerm.startsWith(prefixNorm)) {
					termCounts.set(q.term, (termCounts.get(q.term) ?? 0) + 1);
				}
			}

			// Also match index titles
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

			// Merge: popular terms first, then title suggestions
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

		async getRecentQueries(sessionId, limit = 10) {
			const all = (await data.findMany("searchQuery", {
				where: { sessionId },
			})) as unknown as SearchQuery[];

			// Sort by date desc, deduplicate by normalized term
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
			const all = (await data.findMany(
				"searchQuery",
				{},
			)) as unknown as SearchQuery[];

			if (all.length === 0) {
				return {
					totalQueries: 0,
					uniqueTerms: 0,
					avgResultCount: 0,
					zeroResultCount: 0,
					zeroResultRate: 0,
				};
			}

			const uniqueTerms = new Set(all.map((q) => q.normalizedTerm));
			const totalResults = all.reduce((sum, q) => sum + q.resultCount, 0);
			const zeroResultCount = all.filter((q) => q.resultCount === 0).length;

			return {
				totalQueries: all.length,
				uniqueTerms: uniqueTerms.size,
				avgResultCount: Math.round(totalResults / all.length),
				zeroResultCount,
				zeroResultRate: Math.round((zeroResultCount / all.length) * 100),
			};
		},

		async addSynonym(term, synonyms) {
			// Check if synonym for this term already exists
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
