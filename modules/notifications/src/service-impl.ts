import type { ModuleDataService, ScopedEventEmitter } from "@86d-app/core";
import type {
	BatchSendResult,
	Notification,
	NotificationPreference,
	NotificationStats,
	NotificationsController,
	NotificationTemplate,
} from "./service";

const DEFAULT_PREFERENCES: Omit<NotificationPreference, "id" | "customerId"> = {
	orderUpdates: true,
	promotions: true,
	shippingAlerts: true,
	accountAlerts: true,
	updatedAt: new Date(),
};

export interface NotificationsControllerOptions {
	/** Max notifications per customer before oldest are auto-deleted */
	maxPerCustomer?: number | undefined;
}

/**
 * Interpolate `{{variable}}` placeholders in a template string.
 * Unknown variables are left as-is.
 */
function interpolate(
	template: string,
	variables: Record<string, string>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
		key in variables ? variables[key] : `{{${key}}}`,
	);
}

export function createNotificationsController(
	data: ModuleDataService,
	events?: ScopedEventEmitter | undefined,
	options?: NotificationsControllerOptions | undefined,
): NotificationsController {
	/** Remove oldest notifications when a customer exceeds maxPerCustomer */
	async function enforceMaxPerCustomer(customerId: string): Promise<void> {
		const max = options?.maxPerCustomer;
		if (!max) return;

		const all = (await data.findMany("notification", {
			where: { customerId },
		})) as unknown as Notification[];

		if (all.length <= max) return;

		// Sort oldest-first
		const sorted = [...all].sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		);
		const toRemove = sorted.slice(0, all.length - max);
		for (const n of toRemove) {
			await data.delete("notification", n.id);
		}
	}

	return {
		async create(params) {
			const id = crypto.randomUUID();
			const now = new Date();
			const notification: Notification = {
				id,
				customerId: params.customerId,
				type: params.type ?? "info",
				channel: params.channel ?? "in_app",
				priority: params.priority ?? "normal",
				title: params.title,
				body: params.body,
				actionUrl: params.actionUrl,
				metadata: params.metadata ?? {},
				read: false,
				createdAt: now,
			};
			await data.upsert(
				"notification",
				id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires Record<string, any>
				notification as Record<string, any>,
			);

			await enforceMaxPerCustomer(params.customerId);

			if (events) {
				void events.emit("notifications.created", {
					notificationId: id,
					customerId: params.customerId,
					type: notification.type,
					priority: notification.priority,
				});
			}

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
			if (params?.priority) where.priority = params.priority;

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

			if (events) {
				void events.emit("notifications.read", {
					notificationId: id,
					customerId: notification.customerId,
				});
			}

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

			if (events && count > 0) {
				void events.emit("notifications.all_read", {
					customerId,
					count,
				});
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
				byPriority: {},
			};

			for (const n of notifications) {
				if (!n.read) stats.unread++;
				stats.byType[n.type] = (stats.byType[n.type] ?? 0) + 1;
				stats.byPriority[n.priority ?? "normal"] =
					(stats.byPriority[n.priority ?? "normal"] ?? 0) + 1;
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

		async deletePreferences(customerId) {
			const matches = await data.findMany("preference", {
				where: { customerId },
				take: 1,
			});
			const existing = matches[0] as unknown as
				| NotificationPreference
				| undefined;
			if (!existing) return false;
			await data.delete("preference", existing.id);
			return true;
		},

		async listPreferences(params) {
			const all = await data.findMany("preference", {
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as NotificationPreference[];
		},

		// --- Template CRUD ---

		async createTemplate(params) {
			const id = crypto.randomUUID();
			const now = new Date();
			const template: NotificationTemplate = {
				id,
				slug: params.slug,
				name: params.name,
				type: params.type ?? "info",
				channel: params.channel ?? "in_app",
				priority: params.priority ?? "normal",
				titleTemplate: params.titleTemplate,
				bodyTemplate: params.bodyTemplate,
				actionUrlTemplate: params.actionUrlTemplate,
				variables: params.variables ?? [],
				active: true,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("template", id, template as Record<string, any>);
			return template;
		},

		async getTemplate(id) {
			const raw = await data.get("template", id);
			if (!raw) return null;
			return raw as unknown as NotificationTemplate;
		},

		async getTemplateBySlug(slug) {
			const matches = await data.findMany("template", {
				where: { slug },
				take: 1,
			});
			const found = matches[0] as unknown as NotificationTemplate | undefined;
			return found ?? null;
		},

		async updateTemplate(id, params) {
			const existing = await data.get("template", id);
			if (!existing) return null;

			const template = existing as unknown as NotificationTemplate;
			const now = new Date();
			const updated: NotificationTemplate = {
				...template,
				...(params.name !== undefined ? { name: params.name } : {}),
				...(params.type !== undefined ? { type: params.type } : {}),
				...(params.channel !== undefined ? { channel: params.channel } : {}),
				...(params.priority !== undefined ? { priority: params.priority } : {}),
				...(params.titleTemplate !== undefined
					? { titleTemplate: params.titleTemplate }
					: {}),
				...(params.bodyTemplate !== undefined
					? { bodyTemplate: params.bodyTemplate }
					: {}),
				...(params.actionUrlTemplate !== undefined
					? { actionUrlTemplate: params.actionUrlTemplate }
					: {}),
				...(params.variables !== undefined
					? { variables: params.variables }
					: {}),
				...(params.active !== undefined ? { active: params.active } : {}),
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("template", id, updated as Record<string, any>);
			return updated;
		},

		async deleteTemplate(id) {
			const existing = await data.get("template", id);
			if (!existing) return false;
			await data.delete("template", id);
			return true;
		},

		async listTemplates(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.active !== undefined) where.active = params.active;

			const all = await data.findMany("template", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as NotificationTemplate[];
		},

		// --- Batch + template-based send ---

		async sendFromTemplate(params) {
			const template = await data.get("template", params.templateId);
			if (!template) {
				return {
					sent: 0,
					failed: params.customerIds.length,
					errors: params.customerIds.map((customerId) => ({
						customerId,
						error: "Template not found",
					})),
				};
			}

			const tpl = template as unknown as NotificationTemplate;
			if (!tpl.active) {
				return {
					sent: 0,
					failed: params.customerIds.length,
					errors: params.customerIds.map((customerId) => ({
						customerId,
						error: "Template is inactive",
					})),
				};
			}

			const vars = params.variables ?? {};
			const title = interpolate(tpl.titleTemplate, vars);
			const body = interpolate(tpl.bodyTemplate, vars);
			const actionUrl = tpl.actionUrlTemplate
				? interpolate(tpl.actionUrlTemplate, vars)
				: undefined;

			const result: BatchSendResult = { sent: 0, failed: 0, errors: [] };

			for (const customerId of params.customerIds) {
				const id = crypto.randomUUID();
				const now = new Date();
				const notification: Notification = {
					id,
					customerId,
					type: tpl.type,
					channel: tpl.channel,
					priority: tpl.priority,
					title,
					body,
					actionUrl,
					metadata: { templateId: tpl.id, templateSlug: tpl.slug },
					read: false,
					createdAt: now,
				};
				await data.upsert(
					"notification",
					id,
					// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
					notification as Record<string, any>,
				);
				result.sent++;
			}

			return result;
		},

		async batchSend(params) {
			const result: BatchSendResult = { sent: 0, failed: 0, errors: [] };

			for (const customerId of params.customerIds) {
				const id = crypto.randomUUID();
				const now = new Date();
				const notification: Notification = {
					id,
					customerId,
					type: params.type ?? "info",
					channel: params.channel ?? "in_app",
					priority: params.priority ?? "normal",
					title: params.title,
					body: params.body,
					actionUrl: params.actionUrl,
					metadata: params.metadata ?? {},
					read: false,
					createdAt: now,
				};
				await data.upsert(
					"notification",
					id,
					// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
					notification as Record<string, any>,
				);
				result.sent++;
			}

			return result;
		},
	};
}
