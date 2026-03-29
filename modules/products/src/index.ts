import type { Module, ModuleConfig } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { controllers } from "./controllers";
import {
	toMarkdownCollectionDetail,
	toMarkdownCollectionListing,
	toMarkdownProductDetail,
	toMarkdownProductListing,
} from "./markdown";
import { productsSchema } from "./schema";
import { storeEndpoints } from "./store/endpoints";

export interface ProductsOptions extends ModuleConfig {
	/**
	 * Default number of products per page
	 * @default 20
	 */
	defaultPageSize?: number;
	/**
	 * Maximum number of products per page
	 * @default 100
	 */
	maxPageSize?: number;
	/**
	 * Enable inventory tracking by default
	 * @default true
	 */
	trackInventory?: boolean;
}

export default function products(options?: ProductsOptions): Module {
	return {
		id: "products",
		version: "0.0.1",
		schema: productsSchema,
		exports: {
			read: [
				"productTitle",
				"productPrice",
				"productSlug",
				"productStatus",
				"categoryName",
				"categorySlug",
				"collectionName",
				"collectionSlug",
			],
		},
		events: {
			emits: ["product.created", "product.updated", "product.deleted"],
		},
		controllers,
		options,
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		search: { store: "/products/store-search" },
		admin: {
			pages: [
				{
					path: "/admin/products",
					component: "ProductList",
					label: "Products",
					icon: "Package",
					group: "Catalog",
				},
				{
					path: "/admin/products/new",
					component: "ProductNew",
				},
				{
					path: "/admin/products/:id/edit",
					component: "ProductEdit",
				},
				{
					path: "/admin/products/:id",
					component: "ProductDetail",
				},
				{
					path: "/admin/categories",
					component: "CategoriesAdmin",
					label: "Categories",
					icon: "SquaresFour",
					group: "Catalog",
				},
				{
					path: "/admin/products/collections",
					component: "CollectionsAdmin",
					label: "Collections",
					icon: "Stack",
					group: "Catalog",
				},
			],
		},
		store: {
			pages: [
				{
					path: "/products",
					component: "ProductListing",
					toMarkdown: toMarkdownProductListing,
				},
				{
					path: "/products/:slug",
					component: "ProductDetail",
					toMarkdown: toMarkdownProductDetail,
				},
				{
					path: "/collections",
					component: "CollectionGrid",
					toMarkdown: toMarkdownCollectionListing,
				},
				{
					path: "/collections/:slug",
					component: "CollectionDetail",
					toMarkdown: toMarkdownCollectionDetail,
				},
			],
		},
	};
}
