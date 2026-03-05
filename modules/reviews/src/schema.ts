import type { ModuleSchema } from "@86d-app/core";

export const reviewsSchema = {
	review: {
		fields: {
			id: { type: "string", required: true },
			productId: { type: "string", required: true },
			customerId: { type: "string", required: false },
			authorName: { type: "string", required: true },
			authorEmail: { type: "string", required: true },
			rating: { type: "number", required: true },
			title: { type: "string", required: false },
			body: { type: "string", required: true },
			status: { type: "string", required: true, defaultValue: "pending" },
			isVerifiedPurchase: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},
			helpfulCount: { type: "number", required: true, defaultValue: 0 },
			merchantResponse: { type: "string", required: false },
			merchantResponseAt: { type: "date", required: false },
			moderationNote: { type: "string", required: false },
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
