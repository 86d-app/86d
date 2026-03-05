import type { ModuleSchema } from "@86d-app/core";

export const inventorySchema = {
	inventoryItem: {
		fields: {
			id: { type: "string", required: true },
			productId: { type: "string", required: true },
			variantId: { type: "string", required: false },
			locationId: { type: "string", required: false },
			/** Total units on hand */
			quantity: { type: "number", required: true, defaultValue: 0 },
			/** Units reserved for pending orders */
			reserved: { type: "number", required: true, defaultValue: 0 },
			lowStockThreshold: { type: "number", required: false },
			allowBackorder: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
	backInStockSubscription: {
		fields: {
			id: { type: "string", required: true },
			productId: { type: "string", required: true },
			variantId: { type: "string", required: false },
			email: { type: "string", required: true },
			customerId: { type: "string", required: false },
			/** Product name snapshot for display */
			productName: { type: "string", required: false },
			/** "active" or "notified" */
			status: { type: "string", required: true, defaultValue: "active" },
			subscribedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			notifiedAt: { type: "date", required: false },
		},
	},
} satisfies ModuleSchema;
