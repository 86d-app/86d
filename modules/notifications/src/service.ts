import type { ModuleController } from "@86d-app/core";

export type NotificationType =
	| "info"
	| "success"
	| "warning"
	| "error"
	| "order"
	| "shipping"
	| "promotion";

export type NotificationChannel = "in_app" | "email" | "both";

export interface Notification {
	id: string;
	customerId: string;
	type: NotificationType;
	channel: NotificationChannel;
	title: string;
	body: string;
	actionUrl?: string | undefined;
	metadata: Record<string, unknown>;
	read: boolean;
	readAt?: Date | undefined;
	createdAt: Date;
}

export interface NotificationPreference {
	id: string;
	customerId: string;
	orderUpdates: boolean;
	promotions: boolean;
	shippingAlerts: boolean;
	accountAlerts: boolean;
	updatedAt: Date;
}

export interface NotificationStats {
	total: number;
	unread: number;
	byType: Record<string, number>;
}

export interface NotificationsController extends ModuleController {
	create(params: {
		customerId: string;
		type?: NotificationType | undefined;
		channel?: NotificationChannel | undefined;
		title: string;
		body: string;
		actionUrl?: string | undefined;
		metadata?: Record<string, unknown> | undefined;
	}): Promise<Notification>;

	get(id: string): Promise<Notification | null>;

	update(
		id: string,
		params: {
			title?: string | undefined;
			body?: string | undefined;
			actionUrl?: string | undefined;
			metadata?: Record<string, unknown> | undefined;
		},
	): Promise<Notification | null>;

	delete(id: string): Promise<boolean>;

	list(params?: {
		customerId?: string | undefined;
		type?: NotificationType | undefined;
		read?: boolean | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Notification[]>;

	markRead(id: string): Promise<Notification | null>;

	markAllRead(customerId: string): Promise<number>;

	unreadCount(customerId: string): Promise<number>;

	getStats(): Promise<NotificationStats>;

	bulkDelete(ids: string[]): Promise<number>;

	getPreferences(customerId: string): Promise<NotificationPreference>;

	updatePreferences(
		customerId: string,
		params: {
			orderUpdates?: boolean | undefined;
			promotions?: boolean | undefined;
			shippingAlerts?: boolean | undefined;
			accountAlerts?: boolean | undefined;
		},
	): Promise<NotificationPreference>;
}
