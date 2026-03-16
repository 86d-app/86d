import type { ModuleDataService, ScopedEventEmitter } from "@86d-app/core";
import type {
	MenuSync,
	OrderStats,
	UberEatsController,
	UberOrder,
	UberOrderStatus,
} from "./service";

export function createUberEatsController(
	data: ModuleDataService,
	events?: ScopedEventEmitter | undefined,
): UberEatsController {
	return {
		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();
			const order: UberOrder = {
				id,
				externalOrderId: params.externalOrderId,
				status: "pending",
				items: params.items,
				subtotal: params.subtotal,
				deliveryFee: params.deliveryFee,
				tax: params.tax,
				total: params.total,
				customerName: params.customerName,
				customerPhone: params.customerPhone,
				specialInstructions: params.specialInstructions,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("uberOrder", id, order as Record<string, any>);
			void events?.emit("ubereats.order.received", {
				orderId: order.id,
				externalOrderId: order.externalOrderId,
				total: order.total,
			});
			return order;
		},

		async acceptOrder(id) {
			const existing = await data.get("uberOrder", id);
			if (!existing) return null;

			const order = existing as unknown as UberOrder;
			if (order.status !== "pending") return null;

			const now = new Date();
			const updated: UberOrder = {
				...order,
				status: "accepted",
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("uberOrder", id, updated as Record<string, any>);
			void events?.emit("ubereats.order.accepted", {
				orderId: updated.id,
				externalOrderId: updated.externalOrderId,
			});
			return updated;
		},

		async markReady(id) {
			const existing = await data.get("uberOrder", id);
			if (!existing) return null;

			const order = existing as unknown as UberOrder;
			if (order.status !== "accepted" && order.status !== "preparing") {
				return null;
			}

			const now = new Date();
			const updated: UberOrder = {
				...order,
				status: "ready",
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("uberOrder", id, updated as Record<string, any>);
			void events?.emit("ubereats.order.ready", {
				orderId: updated.id,
				externalOrderId: updated.externalOrderId,
			});
			return updated;
		},

		async cancelOrder(id) {
			const existing = await data.get("uberOrder", id);
			if (!existing) return null;

			const order = existing as unknown as UberOrder;
			if (
				order.status === "delivered" ||
				order.status === "cancelled" ||
				order.status === "picked-up"
			) {
				return null;
			}

			const now = new Date();
			const updated: UberOrder = {
				...order,
				status: "cancelled",
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("uberOrder", id, updated as Record<string, any>);
			void events?.emit("ubereats.order.cancelled", {
				orderId: updated.id,
				externalOrderId: updated.externalOrderId,
			});
			return updated;
		},

		async getOrder(id) {
			const raw = await data.get("uberOrder", id);
			if (!raw) return null;
			return raw as unknown as UberOrder;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("uberOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as UberOrder[];
		},

		async syncMenu(itemCount) {
			const now = new Date();
			const id = crypto.randomUUID();
			const sync: MenuSync = {
				id,
				status: "synced",
				itemCount,
				startedAt: now,
				completedAt: now,
				createdAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("menuSync", id, sync as Record<string, any>);
			void events?.emit("ubereats.menu.synced", {
				menuSyncId: sync.id,
				itemCount,
			});
			return sync;
		},

		async getLastMenuSync() {
			const all = await data.findMany("menuSync", {});
			const syncs = all as unknown as MenuSync[];
			if (syncs.length === 0) return null;

			let latest: MenuSync | null = null;
			for (const s of syncs) {
				if (!latest || s.createdAt > latest.createdAt) {
					latest = s;
				}
			}
			return latest;
		},

		async listMenuSyncs(params) {
			const all = await data.findMany("menuSync", {
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as MenuSync[];
		},

		async getOrderStats() {
			const all = await data.findMany("uberOrder", {});
			const orders = all as unknown as UberOrder[];

			const stats: OrderStats = {
				total: orders.length,
				pending: 0,
				accepted: 0,
				preparing: 0,
				ready: 0,
				delivered: 0,
				cancelled: 0,
				totalRevenue: 0,
			};

			for (const o of orders) {
				const s = o.status as UberOrderStatus;
				if (s === "pending") stats.pending++;
				else if (s === "accepted") stats.accepted++;
				else if (s === "preparing") stats.preparing++;
				else if (s === "ready") stats.ready++;
				else if (s === "delivered") stats.delivered++;
				else if (s === "cancelled") stats.cancelled++;

				if (s !== "cancelled") {
					stats.totalRevenue += o.total;
				}
			}

			return stats;
		},
	};
}
