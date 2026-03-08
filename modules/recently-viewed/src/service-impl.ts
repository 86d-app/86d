import type { ModuleDataService } from "@86d-app/core";
import type { ProductView, RecentlyViewedController } from "./service";

/** Dedup window: ignore repeat views of the same product within 5 minutes */
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

export function createRecentlyViewedController(
	data: ModuleDataService,
): RecentlyViewedController {
	return {
		async trackView(params) {
			// Build a where filter for dedup check
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {
				productId: params.productId,
			};
			if (params.customerId) where.customerId = params.customerId;
			else if (params.sessionId) where.sessionId = params.sessionId;

			// Check if already viewed recently (within dedup window)
			const recent = (await data.findMany("productView", {
				where,
			})) as unknown as ProductView[];

			const now = new Date();
			const existing = recent.find((v) => {
				const elapsed = now.getTime() - new Date(v.viewedAt).getTime();
				return elapsed < DEDUP_WINDOW_MS;
			});

			if (existing) {
				// Update the timestamp and snapshot data
				const updated: ProductView = {
					...existing,
					productName: params.productName,
					productSlug: params.productSlug,
					productImage: params.productImage,
					productPrice: params.productPrice,
					viewedAt: now,
				};
				await data.upsert(
					"productView",
					existing.id,
					// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
					updated as Record<string, any>,
				);
				return updated;
			}

			const id = crypto.randomUUID();
			const view: ProductView = {
				id,
				customerId: params.customerId,
				sessionId: params.sessionId,
				productId: params.productId,
				productName: params.productName,
				productSlug: params.productSlug,
				productImage: params.productImage,
				productPrice: params.productPrice,
				viewedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("productView", id, view as Record<string, any>);
			return view;
		},

		async getRecentViews(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params.customerId) where.customerId = params.customerId;
			else if (params.sessionId) where.sessionId = params.sessionId;

			if (Object.keys(where).length === 0) return [];

			const views = (await data.findMany("productView", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params.take !== undefined ? { take: params.take } : {}),
				...(params.skip !== undefined ? { skip: params.skip } : {}),
			})) as unknown as ProductView[];

			// Sort by viewedAt descending (most recent first)
			return views.sort(
				(a, b) =>
					new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
			);
		},

		async getPopularProducts(params) {
			const all = (await data.findMany(
				"productView",
				{},
			)) as unknown as ProductView[];

			const productCounts = new Map<
				string,
				{
					productId: string;
					productName: string;
					productSlug: string;
					productImage?: string | undefined;
					viewCount: number;
				}
			>();

			for (const view of all) {
				const entry = productCounts.get(view.productId);
				if (entry) {
					entry.viewCount += 1;
				} else {
					productCounts.set(view.productId, {
						productId: view.productId,
						productName: view.productName,
						productSlug: view.productSlug,
						productImage: view.productImage,
						viewCount: 1,
					});
				}
			}

			const take = params?.take ?? 10;
			return Array.from(productCounts.values())
				.sort((a, b) => b.viewCount - a.viewCount)
				.slice(0, take);
		},

		async clearHistory(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params.customerId) where.customerId = params.customerId;
			else if (params.sessionId) where.sessionId = params.sessionId;

			if (Object.keys(where).length === 0) return 0;

			const views = (await data.findMany("productView", {
				where,
			})) as unknown as ProductView[];

			for (const view of views) {
				await data.delete("productView", view.id);
			}
			return views.length;
		},

		async deleteView(id) {
			const existing = await data.get("productView", id);
			if (!existing) return false;
			await data.delete("productView", id);
			return true;
		},

		async listAll(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.customerId) where.customerId = params.customerId;
			if (params?.productId) where.productId = params.productId;

			const views = (await data.findMany("productView", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			})) as unknown as ProductView[];

			return views.sort(
				(a, b) =>
					new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
			);
		},

		async countViews(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.customerId) where.customerId = params.customerId;
			if (params?.productId) where.productId = params.productId;

			const views = (await data.findMany("productView", {
				...(Object.keys(where).length > 0 ? { where } : {}),
			})) as unknown as ProductView[];

			return views.length;
		},

		async mergeHistory(params) {
			const sessionViews = (await data.findMany("productView", {
				where: { sessionId: params.sessionId },
			})) as unknown as ProductView[];

			let merged = 0;
			for (const view of sessionViews) {
				// Check if customer already has a view for this product
				const existing = (await data.findMany("productView", {
					where: {
						customerId: params.customerId,
						productId: view.productId,
					},
				})) as unknown as ProductView[];

				if (existing.length > 0) {
					// Customer already viewed this product — delete the session view
					await data.delete("productView", view.id);
				} else {
					// Transfer session view to customer
					const updated: ProductView = {
						...view,
						customerId: params.customerId,
						sessionId: undefined,
					};
					await data.upsert(
						"productView",
						view.id,
						// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
						updated as Record<string, any>,
					);
					merged += 1;
				}
			}
			return merged;
		},
	};
}
