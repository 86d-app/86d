import type { ModuleDataService } from "@86d-app/core";
import type {
	ChannelOrder,
	ChannelStats,
	FeedSubmission,
	GoogleShoppingController,
	ProductFeedItem,
} from "./service";

export function createGoogleShoppingController(
	data: ModuleDataService,
): GoogleShoppingController {
	return {
		async createFeedItem(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const item: ProductFeedItem = {
				id,
				localProductId: params.localProductId,
				googleProductId: params.googleProductId,
				title: params.title,
				description: params.description,
				status: params.status ?? "pending",
				disapprovalReasons: params.disapprovalReasons ?? [],
				googleCategory: params.googleCategory,
				condition: params.condition ?? "new",
				availability: params.availability ?? "in-stock",
				price: params.price,
				salePrice: params.salePrice,
				link: params.link,
				imageLink: params.imageLink,
				gtin: params.gtin,
				mpn: params.mpn,
				brand: params.brand,
				lastSyncedAt: undefined,
				expiresAt: params.expiresAt,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("productFeed", id, item as Record<string, any>);
			return item;
		},

		async updateFeedItem(id, params) {
			const existing = await data.get("productFeed", id);
			if (!existing) return null;

			const item = existing as unknown as ProductFeedItem;
			const now = new Date();

			const updated: ProductFeedItem = {
				...item,
				...(params.googleProductId !== undefined
					? { googleProductId: params.googleProductId }
					: {}),
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.description !== undefined
					? { description: params.description }
					: {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.disapprovalReasons !== undefined
					? { disapprovalReasons: params.disapprovalReasons }
					: {}),
				...(params.googleCategory !== undefined
					? { googleCategory: params.googleCategory }
					: {}),
				...(params.condition !== undefined
					? { condition: params.condition }
					: {}),
				...(params.availability !== undefined
					? { availability: params.availability }
					: {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.salePrice !== undefined
					? { salePrice: params.salePrice }
					: {}),
				...(params.link !== undefined ? { link: params.link } : {}),
				...(params.imageLink !== undefined
					? { imageLink: params.imageLink }
					: {}),
				...(params.gtin !== undefined ? { gtin: params.gtin } : {}),
				...(params.mpn !== undefined ? { mpn: params.mpn } : {}),
				...(params.brand !== undefined ? { brand: params.brand } : {}),
				...(params.expiresAt !== undefined
					? { expiresAt: params.expiresAt }
					: {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("productFeed", id, updated as Record<string, any>);
			return updated;
		},

		async deleteFeedItem(id) {
			const existing = await data.get("productFeed", id);
			if (!existing) return false;
			await data.delete("productFeed", id);
			return true;
		},

		async getFeedItem(id) {
			const raw = await data.get("productFeed", id);
			if (!raw) return null;
			return raw as unknown as ProductFeedItem;
		},

		async getFeedItemByProduct(localProductId) {
			const matches = await data.findMany("productFeed", {
				where: { localProductId },
				take: 1,
			});
			return (matches[0] as unknown as ProductFeedItem) ?? null;
		},

		async listFeedItems(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("productFeed", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as ProductFeedItem[];
		},

		async submitFeed() {
			const now = new Date();
			const id = crypto.randomUUID();

			const allItems = await data.findMany("productFeed", {});
			const items = allItems as unknown as ProductFeedItem[];

			const approved = items.filter((i) => i.status === "active").length;
			const disapproved = items.filter(
				(i) => i.status === "disapproved",
			).length;

			const submission: FeedSubmission = {
				id,
				status: "pending",
				totalProducts: items.length,
				approvedProducts: approved,
				disapprovedProducts: disapproved,
				submittedAt: now,
				createdAt: now,
			};

			await data.upsert(
				"feedSubmission",
				id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				submission as Record<string, any>,
			);
			return submission;
		},

		async getLastSubmission() {
			const all = await data.findMany("feedSubmission", {
				orderBy: { createdAt: "desc" },
				take: 1,
			});
			return (all[0] as unknown as FeedSubmission) ?? null;
		},

		async listSubmissions(params) {
			const all = await data.findMany("feedSubmission", {
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as FeedSubmission[];
		},

		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const order: ChannelOrder = {
				id,
				googleOrderId: params.googleOrderId,
				status: params.status ?? "pending",
				items: params.items,
				subtotal: params.subtotal,
				shippingCost: params.shippingCost,
				tax: params.tax,
				total: params.total,
				shippingAddress: params.shippingAddress,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("channelOrder", id, order as Record<string, any>);
			return order;
		},

		async getOrder(id) {
			const raw = await data.get("channelOrder", id);
			if (!raw) return null;
			return raw as unknown as ChannelOrder;
		},

		async updateOrderStatus(id, status, trackingNumber, carrier) {
			const existing = await data.get("channelOrder", id);
			if (!existing) return null;

			const order = existing as unknown as ChannelOrder;
			const now = new Date();

			const updated: ChannelOrder = {
				...order,
				status,
				...(trackingNumber !== undefined ? { trackingNumber } : {}),
				...(carrier !== undefined ? { carrier } : {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("channelOrder", id, updated as Record<string, any>);
			return updated;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("channelOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as ChannelOrder[];
		},

		async getChannelStats() {
			const allItems = await data.findMany("productFeed", {});
			const items = allItems as unknown as ProductFeedItem[];

			const allOrders = await data.findMany("channelOrder", {});
			const orders = allOrders as unknown as ChannelOrder[];

			const stats: ChannelStats = {
				totalFeedItems: items.length,
				active: items.filter((i) => i.status === "active").length,
				pending: items.filter((i) => i.status === "pending").length,
				disapproved: items.filter((i) => i.status === "disapproved").length,
				expiring: items.filter((i) => i.status === "expiring").length,
				totalOrders: orders.length,
				totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
			};

			return stats;
		},

		async getDiagnostics() {
			const allItems = await data.findMany("productFeed", {});
			const items = allItems as unknown as ProductFeedItem[];

			const statusMap = new Map<string, number>();
			const reasonMap = new Map<string, number>();

			for (const item of items) {
				statusMap.set(item.status, (statusMap.get(item.status) ?? 0) + 1);
				for (const reason of item.disapprovalReasons ?? []) {
					reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
				}
			}

			return {
				statusBreakdown: [...statusMap.entries()]
					.map(([status, count]) => ({ status, count }))
					.sort((a, b) => b.count - a.count),
				disapprovalReasons: [...reasonMap.entries()]
					.map(([reason, count]) => ({ reason, count }))
					.sort((a, b) => b.count - a.count),
			};
		},
	};
}
