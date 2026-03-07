import type { ModuleDataService } from "@86d-app/core";
import type {
	Notification,
	NotificationPreference,
	NotificationStats,
	NotificationsController,
} from "./service";

const DEFAULT_PREFERENCES: Omit<NotificationPreference, "id" | "customerId"> = {
	orderUpdates: true,
	promotions: true,
	shippingAlerts: true,
	accountAlerts: true,
	updatedAt: new Date(),
};

export function createNotificationsController(
	data: ModuleDataService,
): NotificationsController {
	return {
		async create(params) {
			const id = crypto.randomUUID();
			const now = new Date();
			const notification: Notification = {
				id,
				customerId: params.customerId,
				type: params.type ?? "info",
				channel: params.channel ?? "in_app",
				title: params.title,
				body: params.body,
				actionUrl: params.actionUrl,
				metadata: params.metadata ?? {},
				read: false,
				createdAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert(
				"notification",
				id,
				notification as Record<string, any>,
			);
			return notification;
		},

		async get(id) {
			const raw = await data.get("notification", id);
			if (!raw) return null;
			return raw as unknown as Notification;
		},

		async update(id, params) {
			const existing = await data.get("notification", id);
			if (!existing) return null;

			const notification = existing as unknown as Notification;
			const updated: Notification = {
				...notification,
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.body !== undefined ? { body: params.body } : {}),
				...(params.actionUrl !== undefined
					? { actionUrl: params.actionUrl }
					: {}),
				...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("notification", id, updated as Record<string, any>);
			return updated;
		},

		async delete(id) {
			const existing = await data.get("notification", id);
			if (!existing) return false;
			await data.delete("notification", id);
			return true;
		},

		async list(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.customerId) where.customerId = params.customerId;
			if (params?.type) where.type = params.type;
			if (params?.read !== undefined) where.read = params.read;

			const all = await data.findMany("notification", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as Notification[];
		},

		async markRead(id) {
			const existing = await data.get("notification", id);
			if (!existing) return null;

			const notification = existing as unknown as Notification;
			if (notification.read) return notification;

			const now = new Date();
			const updated: Notification = {
				...notification,
				read: true,
				readAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("notification", id, updated as Record<string, any>);
			return updated;
		},

		async markAllRead(customerId) {
			const unread = await data.findMany("notification", {
				where: { customerId, read: false },
			});
			const notifications = unread as unknown as Notification[];
			const now = new Date();
			let count = 0;

			for (const n of notifications) {
				const updated: Notification = { ...n, read: true, readAt: now };
				await data.upsert(
					"notification",
					n.id,
					// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
					updated as Record<string, any>,
				);
				count++;
			}
			return count;
		},

		async unreadCount(customerId) {
			const unread = await data.findMany("notification", {
				where: { customerId, read: false },
			});
			return unread.length;
		},

		async getStats() {
			const all = await data.findMany("notification", {});
			const notifications = all as unknown as Notification[];

			const stats: NotificationStats = {
				total: notifications.length,
				unread: 0,
				byType: {},
			};

			for (const n of notifications) {
				if (!n.read) stats.unread++;
				stats.byType[n.type] = (stats.byType[n.type] ?? 0) + 1;
			}

			return stats;
		},

		async bulkDelete(ids) {
			let count = 0;
			for (const id of ids) {
				const existing = await data.get("notification", id);
				if (existing) {
					await data.delete("notification", id);
					count++;
				}
			}
			return count;
		},

		async getPreferences(customerId) {
			const matches = await data.findMany("preference", {
				where: { customerId },
				take: 1,
			});
			const existing = matches[0] as unknown as
				| NotificationPreference
				| undefined;

			if (existing) return existing;

			// Return defaults without persisting — creates on first update
			const id = crypto.randomUUID();
			return {
				id,
				customerId,
				...DEFAULT_PREFERENCES,
				updatedAt: new Date(),
			};
		},

		async updatePreferences(customerId, params) {
			const matches = await data.findMany("preference", {
				where: { customerId },
				take: 1,
			});
			const existing = matches[0] as unknown as
				| NotificationPreference
				| undefined;

			const now = new Date();
			const id = existing?.id ?? crypto.randomUUID();
			const updated: NotificationPreference = {
				id,
				customerId,
				orderUpdates: params.orderUpdates ?? existing?.orderUpdates ?? true,
				promotions: params.promotions ?? existing?.promotions ?? true,
				shippingAlerts:
					params.shippingAlerts ?? existing?.shippingAlerts ?? true,
				accountAlerts: params.accountAlerts ?? existing?.accountAlerts ?? true,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("preference", id, updated as Record<string, any>);
			return updated;
		},
	};
}
