import type { ModuleDataService } from "@86d-app/core";
import type {
	ChannelStats,
	WishController,
	WishOrder,
	WishProduct,
} from "./service";

export function createWishController(data: ModuleDataService): WishController {
	return {
		async createProduct(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const product: WishProduct = {
				id,
				localProductId: params.localProductId,
				wishProductId: undefined,
				title: params.title,
				status: "active",
				price: params.price,
				shippingPrice: params.shippingPrice,
				quantity: params.quantity ?? 0,
				parentSku: params.parentSku,
				tags: params.tags ?? [],
				lastSyncedAt: undefined,
				reviewStatus: undefined,
				error: undefined,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("wishProduct", id, product as Record<string, any>);
			return product;
		},

		async updateProduct(id, params) {
			const existing = await data.get("wishProduct", id);
			if (!existing) return null;

			const product = existing as unknown as WishProduct;
			const now = new Date();

			const updated: WishProduct = {
				...product,
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.shippingPrice !== undefined
					? { shippingPrice: params.shippingPrice }
					: {}),
				...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
				...(params.parentSku !== undefined
					? { parentSku: params.parentSku }
					: {}),
				...(params.tags !== undefined ? { tags: params.tags } : {}),
				...(params.wishProductId !== undefined
					? { wishProductId: params.wishProductId }
					: {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.reviewStatus !== undefined
					? { reviewStatus: params.reviewStatus }
					: {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("wishProduct", id, updated as Record<string, any>);
			return updated;
		},

		async disableProduct(id) {
			const existing = await data.get("wishProduct", id);
			if (!existing) return null;

			const product = existing as unknown as WishProduct;
			const now = new Date();

			const updated: WishProduct = {
				...product,
				status: "disabled",
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("wishProduct", id, updated as Record<string, any>);
			return updated;
		},

		async getProduct(id) {
			const raw = await data.get("wishProduct", id);
			if (!raw) return null;
			return raw as unknown as WishProduct;
		},

		async getProductByLocalId(productId) {
			const matches = await data.findMany("wishProduct", {
				where: { localProductId: productId },
				take: 1,
			});
			return (matches[0] as unknown as WishProduct) ?? null;
		},

		async listProducts(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("wishProduct", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as WishProduct[];
		},

		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const order: WishOrder = {
				id,
				wishOrderId: params.wishOrderId,
				status: "pending",
				items: params.items,
				orderTotal: params.orderTotal,
				shippingTotal: params.shippingTotal,
				wishFee: params.wishFee,
				customerName: params.customerName,
				shippingAddress: params.shippingAddress ?? {},
				trackingNumber: undefined,
				carrier: undefined,
				shipByDate: params.shipByDate,
				deliverByDate: params.deliverByDate,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("wishOrder", id, order as Record<string, any>);
			return order;
		},

		async getOrder(id) {
			const raw = await data.get("wishOrder", id);
			if (!raw) return null;
			return raw as unknown as WishOrder;
		},

		async shipOrder(id, trackingNumber, carrier) {
			const existing = await data.get("wishOrder", id);
			if (!existing) return null;

			const order = existing as unknown as WishOrder;
			const now = new Date();

			const updated: WishOrder = {
				...order,
				status: "shipped",
				trackingNumber,
				carrier,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("wishOrder", id, updated as Record<string, any>);
			return updated;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("wishOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as WishOrder[];
		},

		async getChannelStats() {
			const allProducts = await data.findMany("wishProduct", {});
			const products = allProducts as unknown as WishProduct[];
			const allOrders = await data.findMany("wishOrder", {});
			const orders = allOrders as unknown as WishOrder[];

			const stats: ChannelStats = {
				totalProducts: products.length,
				activeProducts: products.filter((p) => p.status === "active").length,
				totalOrders: orders.length,
				totalRevenue: orders.reduce((sum, o) => sum + o.orderTotal, 0),
				pendingShipments: orders.filter(
					(o) => o.status === "pending" || o.status === "approved",
				).length,
				disabledProducts: products.filter((p) => p.status === "disabled")
					.length,
			};

			return stats;
		},

		async getPendingShipments() {
			const pending = await data.findMany("wishOrder", {
				where: { status: "approved" },
				orderBy: { createdAt: "asc" },
			});
			return pending as unknown as WishOrder[];
		},
	};
}
