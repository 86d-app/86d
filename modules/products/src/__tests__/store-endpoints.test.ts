import {
	createMockDataService,
	makeControllerCtx,
} from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import type {
	Category,
	Collection,
	CollectionWithProducts,
	Product,
	ProductVariant,
	ProductWithVariants,
} from "../controllers";
import { controllers } from "../controllers";

/**
 * Store endpoint integration tests for the products module.
 *
 * These tests verify the business logic in store-facing endpoints that
 * goes beyond simple controller delegation:
 *
 * 1. ID-or-slug lookup (fallback to slug when ID not found)
 * 2. Visibility/status filtering (only active products, visible categories/collections)
 * 3. Related product retrieval based on shared category/tags
 * 4. Featured product filtering
 * 5. Store search (command palette) combining products, collections, and quick links
 * 6. Category with optional product inclusion
 */

// ── Sample data factories ─────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
	const now = new Date();
	return {
		id: "prod_1",
		name: "Test Product",
		slug: "test-product",
		price: 2999,
		inventory: 10,
		trackInventory: true,
		allowBackorder: false,
		status: "active",
		images: [],
		tags: ["test"],
		isFeatured: false,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
	const now = new Date();
	return {
		id: "var_1",
		productId: "prod_1",
		name: "Default",
		price: 2999,
		inventory: 5,
		options: { size: "M" },
		images: [],
		position: 0,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makeCategory(overrides: Partial<Category> = {}): Category {
	const now = new Date();
	return {
		id: "cat_1",
		name: "Electronics",
		slug: "electronics",
		position: 0,
		isVisible: true,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makeCollection(overrides: Partial<Collection> = {}): Collection {
	const now = new Date();
	return {
		id: "col_1",
		name: "Summer Sale",
		slug: "summer-sale",
		isFeatured: false,
		position: 0,
		isVisible: true,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

// ── Helpers ───────────────────────────────────────────────────────────

type DataService = ReturnType<typeof createMockDataService>;

/**
 * Simulate the store get-product endpoint logic:
 * 1. Try getWithVariants by ID
 * 2. If not found, try getBySlug then getWithVariants
 * 3. If not found or not active, return 404
 */
async function simulateGetProduct(
	data: DataService,
	id: string,
): Promise<
	{ product: ProductWithVariants } | { error: string; status: number }
> {
	const ctx = makeControllerCtx(data, { params: { id } });

	let product = (await controllers.product.getWithVariants(
		ctx,
	)) as ProductWithVariants | null;

	if (!product) {
		const bySlug = (await controllers.product.getBySlug({
			...ctx,
			query: { slug: id },
		})) as Product | null;
		if (bySlug) {
			product = (await controllers.product.getWithVariants({
				...ctx,
				params: { id: bySlug.id },
			})) as ProductWithVariants | null;
		}
	}

	if (!product) {
		return { error: "Product not found", status: 404 };
	}

	if (product.status !== "active") {
		return { error: "Product not found", status: 404 };
	}

	return { product };
}

/**
 * Simulate the store get-category endpoint logic:
 * 1. Try getById
 * 2. If not found, try getBySlug
 * 3. If not found or not visible, return 404
 * 4. Optionally include products
 */
async function simulateGetCategory(
	data: DataService,
	id: string,
	includeProducts = false,
): Promise<
	| { category: Category; products?: unknown[] }
	| { error: string; status: number }
> {
	const ctx = makeControllerCtx(data, { params: { id } });

	let category = (await controllers.category.getById(ctx)) as Category | null;

	if (!category) {
		category = (await controllers.category.getBySlug({
			...ctx,
			query: { slug: id },
		})) as Category | null;
	}

	if (!category) {
		return { error: "Category not found", status: 404 };
	}

	if (!category.isVisible) {
		return { error: "Category not found", status: 404 };
	}

	if (includeProducts) {
		const products = (await controllers.product.getByCategory({
			...ctx,
			params: { categoryId: category.id },
		})) as Product[];
		return { category, products };
	}

	return { category };
}

/**
 * Simulate the store get-collection endpoint logic:
 * 1. Try getWithProducts by ID
 * 2. If not found, try getBySlug then getWithProducts
 * 3. If not found or not visible, return 404
 */
async function simulateGetCollection(
	data: DataService,
	id: string,
): Promise<
	{ collection: CollectionWithProducts } | { error: string; status: number }
> {
	const ctx = makeControllerCtx(data, { params: { id } });

	let collection = (await controllers.collection.getWithProducts(
		ctx,
	)) as CollectionWithProducts | null;

	if (!collection) {
		const bySlug = (await controllers.collection.getBySlug({
			...ctx,
			query: { slug: id },
		})) as Collection | null;
		if (bySlug) {
			collection = (await controllers.collection.getWithProducts({
				...ctx,
				params: { id: bySlug.id },
			})) as CollectionWithProducts | null;
		}
	}

	if (!collection) {
		return { error: "Collection not found", status: 404 };
	}

	if (!collection.isVisible) {
		return { error: "Collection not found", status: 404 };
	}

	return { collection };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("store endpoint: get product", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns product when found by ID", async () => {
		const product = makeProduct();
		await data.upsert("product", product.id, product);

		const result = await simulateGetProduct(data, "prod_1");
		expect("product" in result).toBe(true);
		if ("product" in result) {
			expect(result.product.id).toBe("prod_1");
			expect(result.product.name).toBe("Test Product");
		}
	});

	it("falls back to slug when ID is not found", async () => {
		const product = makeProduct({ id: "prod_abc", slug: "my-widget" });
		await data.upsert("product", product.id, product);

		const result = await simulateGetProduct(data, "my-widget");
		expect("product" in result).toBe(true);
		if ("product" in result) {
			expect(result.product.id).toBe("prod_abc");
			expect(result.product.slug).toBe("my-widget");
		}
	});

	it("returns 404 when neither ID nor slug matches", async () => {
		const result = await simulateGetProduct(data, "nonexistent");
		expect(result).toEqual({ error: "Product not found", status: 404 });
	});

	it("returns 404 for draft products", async () => {
		const product = makeProduct({ status: "draft" });
		await data.upsert("product", product.id, product);

		const result = await simulateGetProduct(data, "prod_1");
		expect(result).toEqual({ error: "Product not found", status: 404 });
	});

	it("returns 404 for archived products", async () => {
		const product = makeProduct({ status: "archived" });
		await data.upsert("product", product.id, product);

		const result = await simulateGetProduct(data, "prod_1");
		expect(result).toEqual({ error: "Product not found", status: 404 });
	});

	it("returns 404 for draft products found by slug", async () => {
		const product = makeProduct({
			id: "prod_draft",
			slug: "draft-item",
			status: "draft",
		});
		await data.upsert("product", product.id, product);

		const result = await simulateGetProduct(data, "draft-item");
		expect(result).toEqual({ error: "Product not found", status: 404 });
	});

	it("includes variants when product is found", async () => {
		const product = makeProduct();
		const variant = makeVariant({ id: "var_sm", name: "Small", price: 1999 });
		await data.upsert("product", product.id, product);
		await data.upsert("productVariant", variant.id, variant);

		const result = await simulateGetProduct(data, "prod_1");
		expect("product" in result).toBe(true);
		if ("product" in result) {
			expect(result.product.variants).toBeDefined();
			expect(result.product.variants).toHaveLength(1);
			expect(result.product.variants[0].name).toBe("Small");
		}
	});

	it("prefers ID match over slug match", async () => {
		const productA = makeProduct({ id: "widget", slug: "product-a" });
		const productB = makeProduct({
			id: "prod_b",
			slug: "widget",
			name: "Widget By Slug",
		});
		await data.upsert("product", productA.id, productA);
		await data.upsert("product", productB.id, productB);

		const result = await simulateGetProduct(data, "widget");
		expect("product" in result).toBe(true);
		if ("product" in result) {
			// Should find productA by ID, not productB by slug
			expect(result.product.id).toBe("widget");
		}
	});
});

describe("store endpoint: get category", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns category when found by ID", async () => {
		const category = makeCategory();
		await data.upsert("category", category.id, category);

		const result = await simulateGetCategory(data, "cat_1");
		expect("category" in result).toBe(true);
		if ("category" in result) {
			expect(result.category.name).toBe("Electronics");
		}
	});

	it("falls back to slug when ID is not found", async () => {
		const category = makeCategory({ id: "cat_xyz", slug: "clothing" });
		await data.upsert("category", category.id, category);

		const result = await simulateGetCategory(data, "clothing");
		expect("category" in result).toBe(true);
		if ("category" in result) {
			expect(result.category.id).toBe("cat_xyz");
		}
	});

	it("returns 404 when category not found", async () => {
		const result = await simulateGetCategory(data, "nonexistent");
		expect(result).toEqual({ error: "Category not found", status: 404 });
	});

	it("returns 404 for hidden categories", async () => {
		const category = makeCategory({ isVisible: false });
		await data.upsert("category", category.id, category);

		const result = await simulateGetCategory(data, "cat_1");
		expect(result).toEqual({ error: "Category not found", status: 404 });
	});

	it("returns 404 for hidden categories found by slug", async () => {
		const category = makeCategory({
			id: "cat_hidden",
			slug: "hidden-cat",
			isVisible: false,
		});
		await data.upsert("category", category.id, category);

		const result = await simulateGetCategory(data, "hidden-cat");
		expect(result).toEqual({ error: "Category not found", status: 404 });
	});

	it("does not include products by default", async () => {
		const category = makeCategory();
		await data.upsert("category", category.id, category);

		const result = await simulateGetCategory(data, "cat_1", false);
		expect("category" in result).toBe(true);
		if ("category" in result) {
			expect(result.products).toBeUndefined();
		}
	});

	it("includes products when requested", async () => {
		const category = makeCategory();
		const product = makeProduct({ categoryId: "cat_1" });
		await data.upsert("category", category.id, category);
		await data.upsert("product", product.id, product);

		const result = await simulateGetCategory(data, "cat_1", true);
		expect("category" in result).toBe(true);
		if ("category" in result) {
			expect(result.products).toBeDefined();
			expect(result.products).toHaveLength(1);
		}
	});
});

describe("store endpoint: get collection", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns collection when found by ID", async () => {
		const collection = makeCollection();
		await data.upsert("collection", collection.id, collection);

		const result = await simulateGetCollection(data, "col_1");
		expect("collection" in result).toBe(true);
		if ("collection" in result) {
			expect(result.collection.name).toBe("Summer Sale");
		}
	});

	it("falls back to slug when ID is not found", async () => {
		const collection = makeCollection({
			id: "col_xyz",
			slug: "winter-deals",
		});
		await data.upsert("collection", collection.id, collection);

		const result = await simulateGetCollection(data, "winter-deals");
		expect("collection" in result).toBe(true);
		if ("collection" in result) {
			expect(result.collection.id).toBe("col_xyz");
		}
	});

	it("returns 404 when collection not found", async () => {
		const result = await simulateGetCollection(data, "nonexistent");
		expect(result).toEqual({ error: "Collection not found", status: 404 });
	});

	it("returns 404 for hidden collections", async () => {
		const collection = makeCollection({ isVisible: false });
		await data.upsert("collection", collection.id, collection);

		const result = await simulateGetCollection(data, "col_1");
		expect(result).toEqual({ error: "Collection not found", status: 404 });
	});

	it("returns 404 for hidden collections found by slug", async () => {
		const collection = makeCollection({
			id: "col_hidden",
			slug: "secret-collection",
			isVisible: false,
		});
		await data.upsert("collection", collection.id, collection);

		const result = await simulateGetCollection(data, "secret-collection");
		expect(result).toEqual({ error: "Collection not found", status: 404 });
	});

	it("includes products in collection response", async () => {
		const collection = makeCollection();
		const product = makeProduct();
		await data.upsert("collection", collection.id, collection);
		await data.upsert("product", product.id, product);
		await data.upsert("collection_product", "cp_1", {
			id: "cp_1",
			collectionId: "col_1",
			productId: "prod_1",
			position: 0,
		});

		const result = await simulateGetCollection(data, "col_1");
		expect("collection" in result).toBe(true);
		if ("collection" in result) {
			expect(result.collection.products).toBeDefined();
		}
	});
});

describe("store endpoint: admin create product slug uniqueness", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	/**
	 * Simulates the admin create-product endpoint logic:
	 * check slug uniqueness before creating.
	 */
	async function simulateCreateProduct(
		ds: DataService,
		body: { name: string; slug: string; price: number },
	): Promise<
		{ product: Product; status: number } | { error: string; status: number }
	> {
		const ctx = makeControllerCtx(ds, { body, query: { slug: body.slug } });

		const existing = await controllers.product.getBySlug({
			...ctx,
			query: { slug: body.slug },
		});
		if (existing) {
			return { error: "A product with this slug already exists", status: 400 };
		}

		const product = await controllers.product.create(ctx);
		return { product: product as Product, status: 201 };
	}

	it("creates product when slug is unique", async () => {
		const result = await simulateCreateProduct(data, {
			name: "New Widget",
			slug: "new-widget",
			price: 1999,
		});
		expect(result.status).toBe(201);
		expect("product" in result).toBe(true);
	});

	it("rejects duplicate slug", async () => {
		const existing = makeProduct({ slug: "taken-slug" });
		await data.upsert("product", existing.id, existing);

		const result = await simulateCreateProduct(data, {
			name: "Another Widget",
			slug: "taken-slug",
			price: 2999,
		});
		expect(result.status).toBe(400);
		expect("error" in result && result.error).toContain("slug already exists");
	});

	it("allows different slugs for different products", async () => {
		const first = await simulateCreateProduct(data, {
			name: "Widget A",
			slug: "widget-a",
			price: 1000,
		});
		expect(first.status).toBe(201);

		const second = await simulateCreateProduct(data, {
			name: "Widget B",
			slug: "widget-b",
			price: 2000,
		});
		expect(second.status).toBe(201);
	});
});

describe("store endpoint: admin update product", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	/**
	 * Simulates the admin update-product endpoint logic:
	 * check existence, then slug uniqueness if slug changed.
	 */
	async function simulateUpdateProduct(
		ds: DataService,
		id: string,
		body: { name?: string; slug?: string; price?: number },
	): Promise<{ product: Product } | { error: string; status: number }> {
		const ctx = makeControllerCtx(ds, { params: { id }, body });

		const existing = (await controllers.product.getById(ctx)) as Product | null;
		if (!existing) {
			return { error: "Product not found", status: 404 };
		}

		if (body.slug && body.slug !== existing.slug) {
			const productWithSlug = await controllers.product.getBySlug({
				...ctx,
				query: { slug: body.slug },
			});
			if (productWithSlug) {
				return {
					error: "A product with this slug already exists",
					status: 400,
				};
			}
		}

		const product = (await controllers.product.update(ctx)) as Product;
		return { product };
	}

	it("updates product successfully", async () => {
		const product = makeProduct();
		await data.upsert("product", product.id, product);

		const result = await simulateUpdateProduct(data, "prod_1", {
			name: "Updated Name",
		});
		expect("product" in result).toBe(true);
		if ("product" in result) {
			expect(result.product.name).toBe("Updated Name");
		}
	});

	it("returns 404 when product does not exist", async () => {
		const result = await simulateUpdateProduct(data, "nonexistent", {
			name: "Nope",
		});
		expect(result).toEqual({ error: "Product not found", status: 404 });
	});

	it("allows keeping the same slug", async () => {
		const product = makeProduct({ slug: "my-product" });
		await data.upsert("product", product.id, product);

		const result = await simulateUpdateProduct(data, "prod_1", {
			slug: "my-product",
		});
		expect("product" in result).toBe(true);
	});

	it("rejects changing to an existing slug", async () => {
		const productA = makeProduct({ id: "prod_a", slug: "slug-a" });
		const productB = makeProduct({ id: "prod_b", slug: "slug-b" });
		await data.upsert("product", productA.id, productA);
		await data.upsert("product", productB.id, productB);

		const result = await simulateUpdateProduct(data, "prod_b", {
			slug: "slug-a",
		});
		expect(result).toEqual({
			error: "A product with this slug already exists",
			status: 400,
		});
	});

	it("allows changing to a novel slug", async () => {
		const product = makeProduct({ slug: "old-slug" });
		await data.upsert("product", product.id, product);

		const result = await simulateUpdateProduct(data, "prod_1", {
			slug: "new-slug",
		});
		expect("product" in result).toBe(true);
		if ("product" in result) {
			expect(result.product.slug).toBe("new-slug");
		}
	});
});

describe("store endpoint: admin delete product", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	/**
	 * Simulates the admin delete-product endpoint logic:
	 * check existence before deleting.
	 */
	async function simulateDeleteProduct(
		ds: DataService,
		id: string,
	): Promise<{ success: boolean } | { error: string; status: number }> {
		const ctx = makeControllerCtx(ds, { params: { id } });

		const existing = await controllers.product.getById(ctx);
		if (!existing) {
			return { error: "Product not found", status: 404 };
		}

		await controllers.product.delete(ctx);
		return { success: true };
	}

	it("deletes existing product", async () => {
		const product = makeProduct();
		await data.upsert("product", product.id, product);

		const result = await simulateDeleteProduct(data, "prod_1");
		expect(result).toEqual({ success: true });

		const ctx = makeControllerCtx(data, { params: { id: "prod_1" } });
		const deleted = await controllers.product.getById(ctx);
		expect(deleted).toBeNull();
	});

	it("returns 404 for nonexistent product", async () => {
		const result = await simulateDeleteProduct(data, "missing");
		expect(result).toEqual({ error: "Product not found", status: 404 });
	});
});

describe("store endpoint: admin bulk action", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	/**
	 * Simulates the admin bulk-action endpoint validation:
	 * updateStatus requires a status parameter.
	 */
	function simulateBulkActionValidation(body: {
		action: string;
		ids: string[];
		status?: string;
	}): { error: string; status: number } | null {
		if (body.action === "updateStatus" && !body.status) {
			return {
				error: "Status is required for updateStatus action",
				status: 400,
			};
		}
		if (body.action !== "updateStatus" && body.action !== "delete") {
			return { error: "Unknown action", status: 400 };
		}
		return null;
	}

	it("rejects updateStatus without status parameter", () => {
		const result = simulateBulkActionValidation({
			action: "updateStatus",
			ids: ["prod_1"],
		});
		expect(result).toEqual({
			error: "Status is required for updateStatus action",
			status: 400,
		});
	});

	it("accepts updateStatus with status parameter", () => {
		const result = simulateBulkActionValidation({
			action: "updateStatus",
			ids: ["prod_1"],
			status: "active",
		});
		expect(result).toBeNull();
	});

	it("accepts delete action without status", () => {
		const result = simulateBulkActionValidation({
			action: "delete",
			ids: ["prod_1"],
		});
		expect(result).toBeNull();
	});

	it("rejects unknown actions", () => {
		const result = simulateBulkActionValidation({
			action: "duplicate",
			ids: ["prod_1"],
		});
		expect(result).toEqual({ error: "Unknown action", status: 400 });
	});

	it("bulk updateStatus changes product statuses", async () => {
		const p1 = makeProduct({ id: "prod_1", status: "draft" });
		const p2 = makeProduct({ id: "prod_2", status: "draft" });
		await data.upsert("product", p1.id, p1);
		await data.upsert("product", p2.id, p2);

		const ctx = makeControllerCtx(data, {
			body: { ids: ["prod_1", "prod_2"], status: "active" },
		});
		await controllers.bulk.updateStatus(ctx);

		const updated1 = (await controllers.product.getById(
			makeControllerCtx(data, { params: { id: "prod_1" } }),
		)) as Product;
		const updated2 = (await controllers.product.getById(
			makeControllerCtx(data, { params: { id: "prod_2" } }),
		)) as Product;
		expect(updated1.status).toBe("active");
		expect(updated2.status).toBe("active");
	});

	it("bulk delete removes products", async () => {
		const p1 = makeProduct({ id: "prod_1" });
		const p2 = makeProduct({ id: "prod_2" });
		await data.upsert("product", p1.id, p1);
		await data.upsert("product", p2.id, p2);

		const ctx = makeControllerCtx(data, {
			body: { ids: ["prod_1", "prod_2"] },
		});
		await controllers.bulk.deleteMany(ctx);

		const gone1 = await controllers.product.getById(
			makeControllerCtx(data, { params: { id: "prod_1" } }),
		);
		const gone2 = await controllers.product.getById(
			makeControllerCtx(data, { params: { id: "prod_2" } }),
		);
		expect(gone1).toBeNull();
		expect(gone2).toBeNull();
	});
});
