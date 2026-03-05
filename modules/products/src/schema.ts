import type { ModuleSchema } from "@86d-app/core";

export const productsSchema = {
	product: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			name: {
				type: "string",
				required: true,
			},
			slug: {
				type: "string",
				required: true,
				unique: true,
			},
			description: {
				type: "string",
				required: false,
			},
			shortDescription: {
				type: "string",
				required: false,
			},
			price: {
				type: "number",
				required: true,
			},
			compareAtPrice: {
				type: "number",
				required: false,
			},
			costPrice: {
				type: "number",
				required: false,
			},
			sku: {
				type: "string",
				required: false,
				unique: true,
			},
			barcode: {
				type: "string",
				required: false,
			},
			inventory: {
				type: "number",
				required: true,
				defaultValue: 0,
			},
			trackInventory: {
				type: "boolean",
				required: true,
				defaultValue: true,
			},
			allowBackorder: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},
			status: {
				type: ["draft", "active", "archived"],
				required: true,
				defaultValue: "draft",
			},
			categoryId: {
				type: "string",
				required: false,
				references: {
					model: "category",
					field: "id",
					onDelete: "set null",
				},
			},
			images: {
				type: "json",
				required: false,
				defaultValue: [],
			},
			tags: {
				type: "json",
				required: false,
				defaultValue: [],
			},
			metadata: {
				type: "json",
				required: false,
				defaultValue: {},
			},
			weight: {
				type: "number",
				required: false,
			},
			weightUnit: {
				type: ["kg", "lb", "oz", "g"],
				required: false,
				defaultValue: "kg",
			},
			isFeatured: {
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
	productVariant: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			productId: {
				type: "string",
				required: true,
				references: {
					model: "product",
					field: "id",
					onDelete: "cascade",
				},
			},
			name: {
				type: "string",
				required: true,
			},
			sku: {
				type: "string",
				required: false,
				unique: true,
			},
			barcode: {
				type: "string",
				required: false,
			},
			price: {
				type: "number",
				required: true,
			},
			compareAtPrice: {
				type: "number",
				required: false,
			},
			costPrice: {
				type: "number",
				required: false,
			},
			inventory: {
				type: "number",
				required: true,
				defaultValue: 0,
			},
			options: {
				type: "json",
				required: true,
				defaultValue: {},
			},
			images: {
				type: "json",
				required: false,
				defaultValue: [],
			},
			weight: {
				type: "number",
				required: false,
			},
			weightUnit: {
				type: ["kg", "lb", "oz", "g"],
				required: false,
			},
			position: {
				type: "number",
				required: true,
				defaultValue: 0,
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
	category: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			name: {
				type: "string",
				required: true,
			},
			slug: {
				type: "string",
				required: true,
				unique: true,
			},
			description: {
				type: "string",
				required: false,
			},
			parentId: {
				type: "string",
				required: false,
				references: {
					model: "category",
					field: "id",
					onDelete: "set null",
				},
			},
			image: {
				type: "string",
				required: false,
			},
			position: {
				type: "number",
				required: true,
				defaultValue: 0,
			},
			isVisible: {
				type: "boolean",
				required: true,
				defaultValue: true,
			},
			metadata: {
				type: "json",
				required: false,
				defaultValue: {},
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
	collection: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			name: {
				type: "string",
				required: true,
			},
			slug: {
				type: "string",
				required: true,
				unique: true,
			},
			description: {
				type: "string",
				required: false,
			},
			image: {
				type: "string",
				required: false,
			},
			isFeatured: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},
			isVisible: {
				type: "boolean",
				required: true,
				defaultValue: true,
			},
			position: {
				type: "number",
				required: true,
				defaultValue: 0,
			},
			metadata: {
				type: "json",
				required: false,
				defaultValue: {},
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
	collectionProduct: {
		fields: {
			id: {
				type: "string",
				required: true,
			},
			collectionId: {
				type: "string",
				required: true,
				references: {
					model: "collection",
					field: "id",
					onDelete: "cascade",
				},
			},
			productId: {
				type: "string",
				required: true,
				references: {
					model: "product",
					field: "id",
					onDelete: "cascade",
				},
			},
			position: {
				type: "number",
				required: true,
				defaultValue: 0,
			},
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
