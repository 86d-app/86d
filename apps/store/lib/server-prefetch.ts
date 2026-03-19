/**
 * Server-side data prefetching for React Query hydration.
 *
 * Queries the database directly from server components and populates
 * the React Query cache so that client components get instant data
 * (no flash-of-empty-content on hydration).
 *
 * Query keys must match exactly what the module client produces:
 *   [moduleId, namespace, path, input?]
 */

import { db } from "db";
import env from "env";
import { cache } from "react";

// biome-ignore lint/suspicious/noExplicitAny: ModuleData.data is JSONB — shape varies per entity
type JsonData = Record<string, any>;

// ── Module ID resolution ─────────────────────────────────────────────────────

const getModuleDbId = cache(
	async (moduleName: string): Promise<string | null> => {
		const storeId = env.STORE_ID;
		if (!storeId) return null;

		try {
			const mod = await db.module.findFirst({
				where: { storeId, name: moduleName },
				select: { id: true },
			});
			return mod?.id ?? null;
		} catch {
			// DB unavailable (e.g. build time without DATABASE_URL)
			return null;
		}
	},
);

// ── Products ─────────────────────────────────────────────────────────────────

export interface PrefetchedProduct {
	id: string;
	name: string;
	slug: string;
	description?: string | undefined;
	shortDescription?: string | undefined;
	price: number;
	compareAtPrice?: number | undefined;
	sku?: string | undefined;
	inventory: number;
	trackInventory: boolean;
	allowBackorder: boolean;
	status: string;
	categoryId?: string | undefined;
	images: string[];
	tags: string[];
	isFeatured: boolean;
	weight?: number | undefined;
	weightUnit?: string | undefined;
	createdAt: string;
	updatedAt: string;
}

function toProduct(row: {
	id: string;
	data: JsonData;
	createdAt: Date;
	updatedAt: Date;
}): PrefetchedProduct {
	const d = row.data;
	return {
		id: row.id,
		name: d.name ?? "",
		slug: d.slug ?? "",
		description: d.description ?? undefined,
		shortDescription: d.shortDescription ?? undefined,
		price: typeof d.price === "number" ? d.price : 0,
		compareAtPrice:
			typeof d.compareAtPrice === "number" ? d.compareAtPrice : undefined,
		sku: d.sku ?? undefined,
		inventory: typeof d.inventory === "number" ? d.inventory : 0,
		trackInventory: d.trackInventory ?? true,
		allowBackorder: d.allowBackorder ?? false,
		status: d.status ?? "draft",
		categoryId: d.categoryId ?? undefined,
		images: Array.isArray(d.images) ? d.images : [],
		tags: Array.isArray(d.tags) ? d.tags : [],
		isFeatured: d.isFeatured ?? false,
		weight: typeof d.weight === "number" ? d.weight : undefined,
		weightUnit: d.weightUnit ?? undefined,
		createdAt: (d.createdAt
			? new Date(d.createdAt)
			: row.createdAt
		).toISOString(),
		updatedAt: (d.updatedAt
			? new Date(d.updatedAt)
			: row.updatedAt
		).toISOString(),
	};
}

/**
 * Prefetch the default products listing (page 1, 12 items, sorted by createdAt desc).
 * Returns data in the shape that the /products endpoint returns.
 */
export const prefetchProducts = cache(
	async (options?: {
		page?: number;
		limit?: number;
		sort?: string;
		order?: "asc" | "desc";
	}): Promise<{ products: PrefetchedProduct[]; total: number } | null> => {
		const moduleId = await getModuleDbId("products");
		if (!moduleId) return null;

		const page = options?.page ?? 1;
		const limit = options?.limit ?? 12;
		const skip = (page - 1) * limit;

		const [rows, totalCount] = await Promise.all([
			db.moduleData.findMany({
				where: {
					moduleId,
					entityType: "product",
					data: { path: ["status"], equals: "active" },
				},
				orderBy: { createdAt: "desc" },
				take: limit,
				skip,
				select: { id: true, data: true, createdAt: true, updatedAt: true },
			}),
			db.moduleData.count({
				where: {
					moduleId,
					entityType: "product",
					data: { path: ["status"], equals: "active" },
				},
			}),
		]);

		return {
			products: rows.map((r) =>
				toProduct(
					r as { id: string; data: JsonData; createdAt: Date; updatedAt: Date },
				),
			),
			total: totalCount,
		};
	},
);

/**
 * Prefetch categories list.
 */
export const prefetchCategories = cache(
	async (): Promise<{
		categories: Array<{
			id: string;
			name: string;
			slug: string;
			description?: string | undefined;
			parentId?: string | undefined;
			image?: string | undefined;
			position: number;
			isVisible: boolean;
		}>;
	} | null> => {
		const moduleId = await getModuleDbId("products");
		if (!moduleId) return null;

		const rows = await db.moduleData.findMany({
			where: {
				moduleId,
				entityType: "category",
				data: { path: ["isVisible"], equals: true },
			},
			orderBy: { createdAt: "asc" },
			select: { id: true, data: true },
		});

		return {
			categories: rows.map((r) => {
				const d = r.data as JsonData;
				return {
					id: r.id,
					name: d.name ?? "",
					slug: d.slug ?? "",
					description: d.description ?? undefined,
					parentId: d.parentId ?? undefined,
					image: d.image ?? undefined,
					position: typeof d.position === "number" ? d.position : 0,
					isVisible: d.isVisible ?? true,
				};
			}),
		};
	},
);

/**
 * Prefetch a single product by slug (for product detail page).
 * Returns data in the shape that the /products/:id endpoint returns.
 */
export const prefetchProductBySlug = cache(
	async (
		slug: string,
	): Promise<{
		product: PrefetchedProduct & {
			variants: Array<{
				id: string;
				productId: string;
				name: string;
				sku?: string | undefined;
				price: number;
				compareAtPrice?: number | undefined;
				inventory: number;
				options: Record<string, string>;
				images: string[];
				position: number;
				createdAt: string;
				updatedAt: string;
			}>;
		};
		id: string;
	} | null> => {
		const moduleId = await getModuleDbId("products");
		if (!moduleId) return null;

		const row = await db.moduleData.findFirst({
			where: {
				moduleId,
				entityType: "product",
				data: { path: ["slug"], equals: slug },
			},
			select: { id: true, data: true, createdAt: true, updatedAt: true },
		});

		if (!row?.data) return null;
		const d = row.data as JsonData;
		if (d.status !== "active") return null;

		const product = toProduct(
			row as { id: string; data: JsonData; createdAt: Date; updatedAt: Date },
		);

		// Fetch variants
		const variantRows = await db.moduleData.findMany({
			where: {
				moduleId,
				entityType: "productVariant",
				data: { path: ["productId"], equals: row.id },
			},
			orderBy: { createdAt: "asc" },
			select: { id: true, data: true, createdAt: true, updatedAt: true },
		});

		const variants = variantRows.map((v) => {
			const vd = v.data as JsonData;
			return {
				id: v.id,
				productId: row.id,
				name: vd.name ?? "",
				sku: vd.sku ?? undefined,
				price: typeof vd.price === "number" ? vd.price : 0,
				compareAtPrice:
					typeof vd.compareAtPrice === "number" ? vd.compareAtPrice : undefined,
				inventory: typeof vd.inventory === "number" ? vd.inventory : 0,
				options: (vd.options as Record<string, string>) ?? {},
				images: Array.isArray(vd.images) ? vd.images : [],
				position: typeof vd.position === "number" ? vd.position : 0,
				createdAt: (vd.createdAt
					? new Date(vd.createdAt)
					: v.createdAt
				).toISOString(),
				updatedAt: (vd.updatedAt
					? new Date(vd.updatedAt)
					: v.updatedAt
				).toISOString(),
			};
		});

		return { product: { ...product, variants }, id: row.id };
	},
);
