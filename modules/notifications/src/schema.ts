import type { ModuleSchema } from "@86d-app/core";

export const notificationsSchema = {
	notification: {
		fields: {
			id: { type: "string", required: true },
			customerId: { type: "string", required: true },
			type: { type: "string", required: true, defaultValue: "info" },
			channel: { type: "string", required: true, defaultValue: "in_app" },
			title: { type: "string", required: true },
			body: { type: "string", required: true },
			actionUrl: { type: "string", required: false },
			metadata: { type: "json", required: true, defaultValue: {} },
			read: { type: "boolean", required: true, defaultValue: false },
			readAt: { type: "date", required: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
	preference: {
		fields: {
			id: { type: "string", required: true },
			customerId: { type: "string", required: true },
			orderUpdates: { type: "boolean", required: true, defaultValue: true },
			promotions: { type: "boolean", required: true, defaultValue: true },
			shippingAlerts: { type: "boolean", required: true, defaultValue: true },
			accountAlerts: { type: "boolean", required: true, defaultValue: true },
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
