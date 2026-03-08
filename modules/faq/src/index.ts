import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { faqSchema } from "./schema";
import { createFaqControllers } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type { FaqCategory, FaqController, FaqItem } from "./service";

export interface FaqOptions extends ModuleConfig {
	/**
	 * Maximum search results returned per query
	 * @default 20
	 */
	maxSearchResults?: number;
}

/**
 * FAQ module factory function
 * Creates a FAQ / knowledge base module with customer and admin endpoints
 */
export default function faq(options?: FaqOptions): Module {
	return {
		id: "faq",
		version: "1.0.0",
		schema: faqSchema,
		exports: {
			read: ["faqCategories", "faqItems", "faqSearch"],
		},
		events: {
			emits: [
				"faq.category.created",
				"faq.category.updated",
				"faq.category.deleted",
				"faq.item.created",
				"faq.item.updated",
				"faq.item.deleted",
			],
		},

		init: async (ctx: ModuleContext) => {
			const faqController = createFaqControllers(ctx.data);

			return {
				controllers: { faq: faqController },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/faq",
					component: "FaqList",
					label: "FAQ",
					icon: "Question",
					group: "Content",
				},
				{
					path: "/admin/faq/categories",
					component: "FaqCategories",
					label: "FAQ Categories",
					icon: "FolderSimple",
					group: "Content",
				},
				{
					path: "/admin/faq/:id",
					component: "FaqDetail",
				},
				{
					path: "/admin/faq/categories/:id",
					component: "FaqCategoryDetail",
				},
			],
		},
		options,
	};
}
