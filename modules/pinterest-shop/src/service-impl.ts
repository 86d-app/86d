import type { ModuleDataService } from "@86d-app/core";
import type {
	CatalogItem,
	CatalogSync,
	ChannelStats,
	PinAnalytics,
	PinterestShopController,
	ShoppingPin,
} from "./service";

export function createPinterestShopController(
	data: ModuleDataService,
): PinterestShopController {
	return {
		async createCatalogItem(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const item: CatalogItem = {
				id,
				localProductId: params.localProductId,
				pinterestItemId: undefined,
				title: params.title,
				description: params.description,
				status: "active",
				link: params.link,
				imageUrl: params.imageUrl,
				price: params.price,
				salePrice: params.salePrice,
				availability: params.availability ?? "in-stock",
				googleCategory: params.googleCategory,
				lastSyncedAt: undefined,
				error: undefined,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("catalogItem", id, item as Record<string, any>);
			return item;
		},

		async updateCatalogItem(id, params) {
			const existing = await data.get("catalogItem", id);
			if (!existing) return null;

			const item = existing as unknown as CatalogItem;
			const now = new Date();

			const updated: CatalogItem = {
				...item,
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.description !== undefined
					? { description: params.description }
					: {}),
				...(params.link !== undefined ? { link: params.link } : {}),
				...(params.imageUrl !== undefined ? { imageUrl: params.imageUrl } : {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.salePrice !== undefined
					? { salePrice: params.salePrice }
					: {}),
				...(params.availability !== undefined
					? { availability: params.availability }
					: {}),
				...(params.googleCategory !== undefined
					? { googleCategory: params.googleCategory }
					: {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.pinterestItemId !== undefined
					? { pinterestItemId: params.pinterestItemId }
					: {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("catalogItem", id, updated as Record<string, any>);
			return updated;
		},

		async deleteCatalogItem(id) {
			const existing = await data.get("catalogItem", id);
			if (!existing) return false;
			await data.delete("catalogItem", id);
			return true;
		},

		async getCatalogItem(id) {
			const raw = await data.get("catalogItem", id);
			if (!raw) return null;
			return raw as unknown as CatalogItem;
		},

		async getCatalogItemByProduct(productId) {
			const matches = await data.findMany("catalogItem", {
				where: { localProductId: productId },
				take: 1,
			});
			return (matches[0] as unknown as CatalogItem) ?? null;
		},

		async listCatalogItems(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.availability) where.availability = params.availability;

			const all = await data.findMany("catalogItem", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as CatalogItem[];
		},

		async syncCatalog() {
			const now = new Date();
			const id = crypto.randomUUID();

			const allItems = await data.findMany("catalogItem", {
				where: { status: "active" },
			});

			const sync: CatalogSync = {
				id,
				status: "syncing",
				totalItems: allItems.length,
				syncedItems: allItems.length,
				failedItems: 0,
				error: undefined,
				startedAt: now,
				completedAt: now,
				createdAt: now,
			};

			// Mark as synced
			sync.status = "synced";

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("catalogSync", id, sync as Record<string, any>);
			return sync;
		},

		async getLastSync() {
			const all = await data.findMany("catalogSync", {
				orderBy: { createdAt: "desc" },
				take: 1,
			});
			return (all[0] as unknown as CatalogSync) ?? null;
		},

		async listSyncs(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("catalogSync", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as CatalogSync[];
		},

		async createPin(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const pin: ShoppingPin = {
				id,
				catalogItemId: params.catalogItemId,
				pinId: undefined,
				boardId: params.boardId,
				title: params.title,
				description: params.description,
				link: params.link,
				imageUrl: params.imageUrl,
				impressions: 0,
				saves: 0,
				clicks: 0,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("shoppingPin", id, pin as Record<string, any>);
			return pin;
		},

		async getPin(id) {
			const raw = await data.get("shoppingPin", id);
			if (!raw) return null;
			return raw as unknown as ShoppingPin;
		},

		async listPins(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.catalogItemId) where.catalogItemId = params.catalogItemId;

			const all = await data.findMany("shoppingPin", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as ShoppingPin[];
		},

		async getPinAnalytics(id) {
			const raw = await data.get("shoppingPin", id);
			if (!raw) return null;

			const pin = raw as unknown as ShoppingPin;
			const analytics: PinAnalytics = {
				impressions: pin.impressions,
				saves: pin.saves,
				clicks: pin.clicks,
				clickRate: pin.impressions > 0 ? pin.clicks / pin.impressions : 0,
				saveRate: pin.impressions > 0 ? pin.saves / pin.impressions : 0,
			};
			return analytics;
		},

		async getChannelStats() {
			const allItems = await data.findMany("catalogItem", {});
			const items = allItems as unknown as CatalogItem[];
			const allPins = await data.findMany("shoppingPin", {});
			const pins = allPins as unknown as ShoppingPin[];

			const stats: ChannelStats = {
				totalCatalogItems: items.length,
				activeCatalogItems: items.filter((i) => i.status === "active").length,
				totalPins: pins.length,
				totalImpressions: pins.reduce((sum, p) => sum + p.impressions, 0),
				totalClicks: pins.reduce((sum, p) => sum + p.clicks, 0),
				totalSaves: pins.reduce((sum, p) => sum + p.saves, 0),
			};

			return stats;
		},
	};
}
