import type { ModuleSchema } from "@86d-app/core";

export const shippingSchema = {
	shippingZone: {
		fields: {
			id: { type: "string", required: true },
			name: { type: "string", required: true },
			/** ISO 3166-1 alpha-2 country codes; empty = all countries (wildcard) */
			countries: { type: "json", required: true, defaultValue: [] },
			isActive: { type: "boolean", required: true, defaultValue: true },
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
	shippingRate: {
		fields: {
			id: { type: "string", required: true },
			zoneId: {
				type: "string",
				required: true,
				references: { model: "shippingZone", field: "id", onDelete: "cascade" },
			},
			name: { type: "string", required: true },
			/** Price in cents */
			price: { type: "number", required: true, defaultValue: 0 },
			/** Minimum order amount in cents */
			minOrderAmount: { type: "number", required: false },
			/** Maximum order amount in cents */
			maxOrderAmount: { type: "number", required: false },
			/** Minimum weight in grams */
			minWeight: { type: "number", required: false },
			/** Maximum weight in grams */
			maxWeight: { type: "number", required: false },
			isActive: { type: "boolean", required: true, defaultValue: true },
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
} satisfies ModuleSchema;
