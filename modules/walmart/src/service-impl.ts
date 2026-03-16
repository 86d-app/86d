import type { ModuleDataService } from "@86d-app/core";
import type {
	ChannelStats,
	FeedSubmission,
	ItemHealth,
	WalmartController,
	WalmartItem,
	WalmartOrder,
} from "./service";

export function createWalmartController(
	data: ModuleDataService,
): WalmartController {
	return {
		async createItem(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const item: WalmartItem = {
				id,
				localProductId: params.localProductId,
				sku: params.sku,
				title: params.title,
				status: "unpublished",
				lifecycleStatus: "active",
				price: params.price,
				quantity: params.quantity ?? 0,
				upc: params.upc,
				gtin: params.gtin,
				brand: params.brand,
				category: params.category,
				fulfillmentType: params.fulfillmentType ?? "seller",
				publishStatus: undefined,
				lastSyncedAt: undefined,
				error: undefined,
				metadata: params.metadata ?? {},
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("item", id, item as Record<string, any>);
			return item;
		},

		async updateItem(id, params) {
			const existing = await data.get("item", id);
			if (!existing) return null;

			const item = existing as unknown as WalmartItem;
			const now = new Date();

			const updated: WalmartItem = {
				...item,
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
				...(params.upc !== undefined ? { upc: params.upc } : {}),
				...(params.gtin !== undefined ? { gtin: params.gtin } : {}),
				...(params.brand !== undefined ? { brand: params.brand } : {}),
				...(params.category !== undefined ? { category: params.category } : {}),
				...(params.fulfillmentType !== undefined
					? { fulfillmentType: params.fulfillmentType }
					: {}),
				...(params.walmartItemId !== undefined
					? { walmartItemId: params.walmartItemId }
					: {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.publishStatus !== undefined
					? { publishStatus: params.publishStatus }
					: {}),
				...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("item", id, updated as Record<string, any>);
			return updated;
		},

		async retireItem(id) {
			const existing = await data.get("item", id);
			if (!existing) return null;

			const item = existing as unknown as WalmartItem;
			const now = new Date();

			const updated: WalmartItem = {
				...item,
				status: "retired",
				lifecycleStatus: "archived",
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("item", id, updated as Record<string, any>);
			return updated;
		},

		async getItem(id) {
			const raw = await data.get("item", id);
			if (!raw) return null;
			return raw as unknown as WalmartItem;
		},

		async getItemByProduct(productId) {
			const matches = await data.findMany("item", {
				where: { localProductId: productId },
				take: 1,
			});
			return (matches[0] as unknown as WalmartItem) ?? null;
		},

		async listItems(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.fulfillmentType)
				where.fulfillmentType = params.fulfillmentType;

			const all = await data.findMany("item", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as WalmartItem[];
		},

		async submitFeed(feedType) {
			const now = new Date();
			const id = crypto.randomUUID();

			const feed: FeedSubmission = {
				id,
				feedId: undefined,
				feedType,
				status: "pending",
				totalItems: 0,
				successItems: 0,
				errorItems: 0,
				error: undefined,
				submittedAt: now,
				completedAt: undefined,
				createdAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("feedSubmission", id, feed as Record<string, any>);
			return feed;
		},

		async getLastFeed(feedType) {
			const all = await data.findMany("feedSubmission", {
				where: { feedType },
				orderBy: { createdAt: "desc" },
				take: 1,
			});
			return (all[0] as unknown as FeedSubmission) ?? null;
		},

		async listFeeds(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.feedType) where.feedType = params.feedType;
			if (params?.status) where.status = params.status;

			const all = await data.findMany("feedSubmission", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as FeedSubmission[];
		},

		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const order: WalmartOrder = {
				id,
				purchaseOrderId: params.purchaseOrderId,
				status: "created",
				items: params.items,
				orderTotal: params.orderTotal,
				shippingTotal: params.shippingTotal,
				walmartFee: params.walmartFee,
				tax: params.tax,
				customerName: params.customerName,
				shippingAddress: params.shippingAddress ?? {},
				trackingNumber: undefined,
				carrier: undefined,
				shipDate: undefined,
				estimatedDelivery: params.estimatedDelivery,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("walmartOrder", id, order as Record<string, any>);
			return order;
		},

		async acknowledgeOrder(id) {
			const existing = await data.get("walmartOrder", id);
			if (!existing) return null;

			const order = existing as unknown as WalmartOrder;
			const now = new Date();

			const updated: WalmartOrder = {
				...order,
				status: "acknowledged",
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("walmartOrder", id, updated as Record<string, any>);
			return updated;
		},

		async shipOrder(id, trackingNumber, carrier) {
			const existing = await data.get("walmartOrder", id);
			if (!existing) return null;

			const order = existing as unknown as WalmartOrder;
			const now = new Date();

			const updated: WalmartOrder = {
				...order,
				status: "shipped",
				trackingNumber,
				carrier,
				shipDate: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("walmartOrder", id, updated as Record<string, any>);
			return updated;
		},

		async cancelOrder(id) {
			const existing = await data.get("walmartOrder", id);
			if (!existing) return null;

			const order = existing as unknown as WalmartOrder;
			const now = new Date();

			const updated: WalmartOrder = {
				...order,
				status: "cancelled",
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("walmartOrder", id, updated as Record<string, any>);
			return updated;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("walmartOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as WalmartOrder[];
		},

		async getChannelStats() {
			const allItems = await data.findMany("item", {});
			const items = allItems as unknown as WalmartItem[];
			const allOrders = await data.findMany("walmartOrder", {});
			const orders = allOrders as unknown as WalmartOrder[];
			const allFeeds = await data.findMany("feedSubmission", {});
			const feeds = allFeeds as unknown as FeedSubmission[];

			const stats: ChannelStats = {
				totalItems: items.length,
				publishedItems: items.filter((i) => i.status === "published").length,
				totalOrders: orders.length,
				totalRevenue: orders.reduce((sum, o) => sum + o.orderTotal, 0),
				pendingFeeds: feeds.filter((f) => f.status === "pending").length,
				errorItems: items.filter((i) => i.status === "system-error").length,
			};

			return stats;
		},

		async getItemHealth() {
			const allItems = await data.findMany("item", {});
			const items = allItems as unknown as WalmartItem[];

			const health: ItemHealth = {
				total: items.length,
				published: 0,
				unpublished: 0,
				retired: 0,
				systemError: 0,
				sellerFulfilled: 0,
				wfsFulfilled: 0,
			};

			for (const item of items) {
				switch (item.status) {
					case "published":
						health.published++;
						break;
					case "unpublished":
						health.unpublished++;
						break;
					case "retired":
						health.retired++;
						break;
					case "system-error":
						health.systemError++;
						break;
				}
				if (item.fulfillmentType === "seller") health.sellerFulfilled++;
				if (item.fulfillmentType === "wfs") health.wfsFulfilled++;
			}

			return health;
		},
	};
}
