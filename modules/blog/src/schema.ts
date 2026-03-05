import type { ModuleSchema } from "@86d-app/core";

export const blogSchema = {
	post: {
		fields: {
			id: { type: "string", required: true },
			title: { type: "string", required: true },
			slug: { type: "string", required: true },
			content: { type: "string", required: true },
			excerpt: { type: "string", required: false },
			coverImage: { type: "string", required: false },
			author: { type: "string", required: false },
			status: { type: "string", required: true, defaultValue: "draft" },
			tags: { type: "json", required: true, defaultValue: [] },
			category: { type: "string", required: false },
			publishedAt: { type: "date", required: false },
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
