import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { notificationsSchema } from "./schema";
import { createNotificationsController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Notification,
	NotificationChannel,
	NotificationPreference,
	NotificationStats,
	NotificationsController,
	NotificationType,
} from "./service";

export interface NotificationsOptions extends ModuleConfig {
	/** Max notifications per customer before auto-cleanup (default: "500") */
	maxPerCustomer?: string;
}

export default function notifications(options?: NotificationsOptions): Module {
	return {
		id: "notifications",
		version: "0.0.1",
		schema: notificationsSchema,
		exports: {
			read: ["unreadCount", "notificationType"],
		},
		events: {
			emits: [
				"notifications.created",
				"notifications.read",
				"notifications.all_read",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createNotificationsController(ctx.data);
			return { controllers: { notifications: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/notifications",
					component: "NotificationList",
					label: "Notifications",
					icon: "Bell",
					group: "Support",
				},
				{
					path: "/admin/notifications/compose",
					component: "NotificationComposer",
					label: "Compose",
					icon: "PaperPlaneTilt",
					group: "Support",
				},
			],
		},
		options,
	};
}
