import type { ModuleSchema } from "@86d-app/core";

export const wishlistSchema = {
	wishlistItem: {
		fields: {
			id: { type: "string", required: true },
			customerId: { type: "string", required: true },
			productId: { type: "string", required: true },
			productName: { type: "string", required: true },
			productImage: { type: "string", required: false },
			note: { type: "string", required: false },
			addedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
