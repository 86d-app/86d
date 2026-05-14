#!/usr/bin/env tsx

/**
 * Database Seed Script
 *
 * Seeds a deterministic luxury-house demo catalog for development and E2E work.
 *
 * Usage:
 *   bun run db:seed
 *   DATABASE_URL=... bun run db:seed
 *
 * What it creates:
 *   - Admin user (ADMIN_EMAIL / ADMIN_PASSWORD env vars, or admin@example.com / password123)
 *   - 16 luxury products with variants across 6 categories
 *   - 6 mirrored collections in both products + collections modules
 *   - 1 house brand, 3 customers, 1 demo order, and supporting module data
 *   - Uploaded local seed assets stored under stores/{STORE_ID}/seed/luxury-house/...
 *
 * Stock images are produced with: bun run seed:fetch-luxury-assets (see scripts/seed/luxury-stock-sources.json).
 */

import { createHash, randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import pg from "pg";
import {
	createStorageFromEnv,
	type StorageProvider,
} from "../packages/storage/src/index.ts";
import {
	activityEvents,
	announcement,
	blogPosts,
	categories,
	collections,
	customers,
	customerAddresses,
	deliverySchedules,
	demoOrder,
	discounts,
	faqCategories,
	faqItems,
	houseBrand,
	labelAssignments,
	navigationItems,
	newsletterSubscribers,
	pages,
	pickupLocation,
	pickupWindows,
	productByKey,
	productLabels,
	products,
	redirects,
	reviews,
	searchSynonyms,
	seoMeta,
	shippingRates,
	shippingZones,
	sitemapConfig,
	storeLocations,
	storeSettings,
	summary,
	taxCategory,
	taxRates,
	trustBadges,
	type SeedProduct,
	type SeedVariant,
} from "./seed/catalog/luxury-house.ts";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("DATABASE_URL environment variable is required");
	process.exit(1);
}

const STORE_ID = process.env.STORE_ID || "de005b9d-c517-4c65-896e-8edef5cf5a94";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";
const now = new Date().toISOString();
const ASSET_ROOT = resolve(process.cwd(), "scripts/seed-assets/luxury-house");
const ASSET_KEY_PREFIX = `stores/${STORE_ID}/seed/luxury-house`;
const rootPackage = JSON.parse(
	readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { version?: string };
const fallbackModuleVersion = rootPackage.version ?? "0.0.4";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

function uuid(key: string): string {
	const hash = createHash("sha256")
		.update(`86d-seed-v2:${key}`)
		.digest("hex");
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		`4${hash.slice(13, 16)}`,
		`${(0x8 | (Number.parseInt(hash[16], 16) & 0x3)).toString(16)}${hash.slice(17, 20)}`,
		hash.slice(20, 32),
	].join("-");
}

function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const key = scryptSync(password.normalize("NFKC"), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 64 * 1024 * 1024,
	});
	return `${salt}:${key.toString("hex")}`;
}

function cuid(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "c";
	for (let i = 0; i < 24; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

function idsByKey<T extends { key: string }>(
	prefix: string,
	items: T[],
): Record<string, string> {
	return Object.fromEntries(
		items.map((item) => [item.key, uuid(`${prefix}:${item.key}`)]),
	);
}

function mimeTypeForPath(relativePath: string): string {
	switch (extname(relativePath).toLowerCase()) {
		case ".webp":
			return "image/webp";
		case ".png":
			return "image/png";
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		default:
			throw new Error(`Unsupported seed asset type: ${relativePath}`);
	}
}

function moduleVersion(moduleName: string): string {
	const packagePath = resolve(process.cwd(), "modules", moduleName, "package.json");
	if (!existsSync(packagePath)) return fallbackModuleVersion;
	const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
		version?: string;
	};
	return pkg.version ?? fallbackModuleVersion;
}

type AssetResolver = {
	resolveUrl(relativePath: string): Promise<string>;
};

function shouldProxyUploadUrls(): boolean {
	return (process.env.STORAGE_PUBLIC_URL_MODE ?? "direct") === "proxy";
}

function buildPublicUploadUrl(key: string): string {
	return `/uploads/${key}`;
}

function createAssetResolver(storage: StorageProvider): AssetResolver {
	const cache = new Map<string, string>();

	return {
		async resolveUrl(relativePath: string): Promise<string> {
			const existing = cache.get(relativePath);
			if (existing) return existing;

			const absolutePath = resolve(ASSET_ROOT, relativePath);
			const key = `${ASSET_KEY_PREFIX}/${relativePath}`;
			const content = readFileSync(absolutePath);
			const result = await storage.upload({
				key,
				content,
				contentType: mimeTypeForPath(relativePath),
			});
			const publicUrl = shouldProxyUploadUrls()
				? buildPublicUploadUrl(key)
				: result.url;
			cache.set(relativePath, publicUrl);
			return publicUrl;
		},
	};
}

type ResolvedProduct = SeedProduct & {
	id: string;
	categoryId: string;
	inventory: number;
	images: string[];
	variantRecords: Array<
		SeedVariant & {
			id: string;
			productId: string;
		}
	>;
};

const adminUserId = uuid("admin-user");
const adminAccountId = uuid("admin-account");
const moduleIds: Record<string, string> = {};
const moduleNames = [
	"products",
	"collections",
	"cart",
	"orders",
	"customers",
	"settings",
	"inventory",
	"shipping",
	"discounts",
	"reviews",
	"newsletter",
	"analytics",
	"subscriptions",
	"digital-downloads",
	"payments",
	"seo",
	"blog",
	"search",
	"navigation",
	"pages",
	"media",
	"notifications",
	"checkout",
	"tax",
	"fulfillment",
	"brands",
	"announcements",
	"wishlist",
	"recently-viewed",
	"comparisons",
	"recommendations",
	"faq",
	"forms",
	"tickets",
	"loyalty",
	"gift-cards",
	"store-credits",
	"affiliates",
	"referrals",
	"social-proof",
	"product-labels",
	"product-qa",
	"product-feeds",
	"memberships",
	"multi-currency",
	"price-lists",
	"bulk-pricing",
	"bundles",
	"flash-sales",
	"waitlist",
	"backorders",
	"preorders",
	"appointments",
	"auctions",
	"automations",
	"customer-groups",
	"quotes",
	"store-locator",
	"returns",
	"revenue",
	"audit-log",
	"vendors",
	"gift-registry",
	"gift-wrapping",
	"delivery-slots",
	"invoices",
	"store-pickup",
	"import-export",
	"warranties",
	"abandoned-carts",
	"braintree",
	"paypal",
	"square",
	"stripe",
	"redirects",
	"sitemap",
	"amazon",
	"doordash",
	"ebay",
	"etsy",
	"facebook-shop",
	"favor",
	"gamification",
	"google-shopping",
	"instagram-shop",
	"kiosk",
	"order-notes",
	"photo-booth",
	"pinterest-shop",
	"qr-code",
	"saved-addresses",
	"social-sharing",
	"tiktok-shop",
	"tipping",
	"toast",
	"uber-direct",
	"uber-eats",
	"walmart",
	"wish",
	"x-shop",
];
const seededModuleNames = [
	"products",
	"collections",
	"brands",
	"customers",
	"settings",
	"inventory",
	"navigation",
	"orders",
	"reviews",
	"blog",
	"pages",
	"shipping",
	"tax",
	"discounts",
	"faq",
	"announcements",
	"seo",
	"search",
	"newsletter",
	"social-proof",
	"product-labels",
	"redirects",
	"sitemap",
	"store-locator",
	"store-pickup",
	"delivery-slots",
	"wishlist",
	"loyalty",
	"flash-sales",
	"bundles",
	"subscriptions",
	"gift-cards",
	"appointments",
	"memberships",
	"warranties",
	"auctions",
	"store-credits",
	"preorders",
	"referrals",
	"affiliates",
	"customer-groups",
	"abandoned-carts",
	"digital-downloads",
];

for (const name of moduleNames) {
	moduleIds[name] = uuid(`module:${STORE_ID}:${name}`);
}

const categoryIds = idsByKey("category", categories);
const productIds = idsByKey("product", products);
const customerIds = idsByKey("customer", customers);
const collectionIds = idsByKey("collection", collections);
const faqCategoryIds = idsByKey("faq-category", faqCategories);
const blogPostIds = idsByKey("blog-post", blogPosts);
const pageIds = idsByKey("page", pages);
const labelIds = idsByKey("label", productLabels);
const shippingZoneIds = idsByKey("shipping-zone", shippingZones);
const locationIds = idsByKey("store-location", storeLocations);
const variantIdByKey: Record<string, string> = {};
const variantByKey: Record<string, SeedVariant> = {};

for (const product of products) {
	for (const variant of product.variants) {
		variantIdByKey[variant.key] = uuid(`variant:${variant.key}`);
		variantByKey[variant.key] = variant;
	}
}

async function ensureStoreRecord(client: pg.PoolClient) {
	const { rows } = await client.query(
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'Store'
		) AS "exists"`,
	);
	if (!rows[0]?.exists) return;

	const storeExists = await client.query(`SELECT 1 FROM "Store" WHERE id = $1`, [
		STORE_ID,
	]);
	if (storeExists.rows.length > 0) return;

	const businessId = uuid("seed-business");
	await client.query(
		`INSERT INTO "Business" (id, cuid, name, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (id) DO NOTHING`,
		[businessId, cuid(), "86d Atelier Holdings", now, now],
	);

	await client.query(
		`INSERT INTO "Store" (id, cuid, name, "businessId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (id) DO NOTHING`,
		[STORE_ID, cuid(), "86d Atelier", businessId, now, now],
	);
}

async function insertModuleData(
	client: pg.PoolClient,
	moduleName: string,
	entityType: string,
	entityId: string,
	data: Record<string, unknown>,
) {
	const moduleId = moduleIds[moduleName];
	if (!moduleId) return;
	const rowId = uuid(`module-data:${STORE_ID}:${moduleName}:${entityType}:${entityId}`);
	await client.query(
		`INSERT INTO "ModuleData" (id, cuid, "entityType", "entityId", data, "moduleId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT ("moduleId", "entityType", "entityId") DO UPDATE SET data = $5, "updatedAt" = $8`,
		[rowId, cuid(), entityType, entityId, JSON.stringify(data), moduleId, now, now],
	);
}

async function seedAdminUser(client: pg.PoolClient) {
	console.log("  Creating admin user...");
	const hashedPassword = hashPassword(ADMIN_PASSWORD);

	const userResult = await client.query<{ id: string }>(
		`INSERT INTO "User" (id, cuid, name, email, "emailVerified", role, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (email) DO UPDATE SET role = $6, name = $3
		 RETURNING id`,
		[
			adminUserId,
			cuid(),
			"Admin User",
			ADMIN_EMAIL,
			true,
			"admin",
			now,
			now,
		],
	);
	const userId = userResult.rows[0]?.id;
	if (!userId) {
		throw new Error("Failed to resolve admin user ID during seed");
	}

	const existingAccount = await client.query<{ id: string }>(
		`SELECT id FROM "Account" WHERE "userId" = $1 AND "providerId" = $2 LIMIT 1`,
		[userId, "credential"],
	);

	if (existingAccount.rows[0]?.id) {
		await client.query(
			`UPDATE "Account"
			 SET "accountId" = $2, password = $3, "updatedAt" = $4
			 WHERE id = $1`,
			[existingAccount.rows[0].id, userId, hashedPassword, now],
		);
		return;
	}

	await client.query(
		`INSERT INTO "Account" (id, cuid, "accountId", "providerId", password, "userId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[
			adminAccountId,
			cuid(),
			userId,
			"credential",
			hashedPassword,
			userId,
			now,
			now,
		],
	);
}

async function seedModules(client: pg.PoolClient) {
	console.log("  Creating module records...");
	await ensureStoreRecord(client);
	for (const name of moduleNames) {
		const result = await client.query<{ id: string }>(
			`INSERT INTO "Module" (id, cuid, name, version, "isEnabled", "storeId", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT ("storeId", name) DO UPDATE
			 SET version = $4, "isEnabled" = true, "updatedAt" = $8
			 RETURNING id`,
			[
				moduleIds[name],
				cuid(),
				name,
				moduleVersion(name),
				true,
				STORE_ID,
				now,
				now,
			],
		);
		if (result.rows[0]?.id) {
			moduleIds[name] = result.rows[0].id;
		}
	}
}

async function resetManagedModuleData(client: pg.PoolClient) {
	console.log("  Clearing existing seed-managed module data...");
	const managedModuleIds = seededModuleNames
		.map((name) => moduleIds[name])
		.filter(Boolean);
	if (managedModuleIds.length === 0) return;
	await client.query(
		`DELETE FROM "ModuleData" WHERE "moduleId" = ANY($1::uuid[])`,
		[managedModuleIds],
	);
}

async function resolveProducts(assets: AssetResolver): Promise<ResolvedProduct[]> {
	const resolvedProducts: ResolvedProduct[] = [];
	for (const product of products) {
		const images: string[] = [];
		for (const relativePath of product.imagePaths) {
			images.push(await assets.resolveUrl(relativePath));
		}
		const variantRecords = product.variants.map((variant) => ({
			...variant,
			id: variantIdByKey[variant.key],
			productId: productIds[product.key],
		}));
		resolvedProducts.push({
			...product,
			id: productIds[product.key],
			categoryId: categoryIds[product.categoryKey],
			inventory: variantRecords.reduce((sum, variant) => sum + variant.inventory, 0),
			images,
			variantRecords,
		});
	}
	return resolvedProducts;
}

async function seedProducts(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating categories...");
	for (const category of categories) {
		const image = await assets.resolveUrl(category.imagePath);
		await insertModuleData(client, "products", "category", categoryIds[category.key], {
			id: categoryIds[category.key],
			name: category.name,
			slug: category.slug,
			description: category.description,
			image,
			position: category.position,
			isVisible: category.isVisible,
			metadata: category.metadata ?? {},
			createdAt: now,
			updatedAt: now,
		});
	}

	console.log("  Creating products and variants...");
	const resolvedProducts = await resolveProducts(assets);
	for (const product of resolvedProducts) {
		await insertModuleData(client, "products", "product", product.id, {
			id: product.id,
			name: product.name,
			slug: product.slug,
			description: product.description,
			shortDescription: product.shortDescription,
			price: product.price,
			...(product.compareAtPrice != null && {
				compareAtPrice: product.compareAtPrice,
			}),
			...(product.costPrice != null && { costPrice: product.costPrice }),
			sku: product.sku,
			inventory: product.inventory,
			trackInventory: product.trackInventory,
			allowBackorder: product.allowBackorder,
			status: product.status,
			categoryId: product.categoryId,
			images: product.images,
			tags: product.tags,
			metadata: product.metadata,
			weight: product.weight,
			weightUnit: product.weightUnit,
			isFeatured: product.isFeatured,
			createdAt: now,
			updatedAt: now,
		});

		for (const variant of product.variantRecords) {
			await insertModuleData(client, "products", "productVariant", variant.id, {
				id: variant.id,
				productId: variant.productId,
				name: variant.name,
				sku: variant.sku,
				price: variant.price,
				...(variant.compareAtPrice != null && {
					compareAtPrice: variant.compareAtPrice,
				}),
				...(variant.costPrice != null && { costPrice: variant.costPrice }),
				inventory: variant.inventory,
				options: variant.options,
				images: product.images,
				weight: variant.weight,
				weightUnit: variant.weightUnit ?? "kg",
				position: product.variantRecords.findIndex((item) => item.id === variant.id),
				createdAt: now,
				updatedAt: now,
			});
		}
	}
}

function inventoryItemId(
	productId: string,
	variantId?: string,
	locationId?: string,
): string {
	return [productId, variantId ?? "_", locationId ?? "_"].join(":");
}

async function seedCollections(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating product collections...");
	for (const collection of collections) {
		const image = await assets.resolveUrl(collection.imagePath);
		await insertModuleData(client, "products", "collection", collectionIds[collection.key], {
			id: collectionIds[collection.key],
			name: collection.name,
			slug: collection.slug,
			description: collection.description,
			image,
			isFeatured: collection.isFeatured,
			isVisible: collection.isVisible,
			position: collection.position,
			metadata: collection.metadata ?? {},
			createdAt: now,
			updatedAt: now,
		});
		for (const [position, productKey] of collection.productKeys.entries()) {
			const linkId = uuid(`products-collection-link:${collection.key}:${productKey}`);
			await insertModuleData(client, "products", "collectionProduct", linkId, {
				id: linkId,
				collectionId: collectionIds[collection.key],
				productId: productIds[productKey],
				position,
				createdAt: now,
			});
		}
	}
}

async function seedCollectionsModule(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Mirroring collections module data...");
	for (const collection of collections) {
		const image = await assets.resolveUrl(collection.imagePath);
		await insertModuleData(
			client,
			"collections",
			"collection",
			collectionIds[collection.key],
			{
				id: collectionIds[collection.key],
				title: collection.name,
				slug: collection.slug,
				description: collection.description,
				image,
				type: "manual",
				sortOrder: "manual",
				isActive: true,
				isFeatured: collection.isFeatured,
				position: collection.position,
				conditions: { match: "all", rules: [] },
				...(collection.seoTitle != null && { seoTitle: collection.seoTitle }),
				...(collection.seoDescription != null && {
					seoDescription: collection.seoDescription,
				}),
				publishedAt: now,
				createdAt: now,
				updatedAt: now,
			},
		);

		for (const [position, productKey] of collection.productKeys.entries()) {
			const linkId = uuid(`collections-module-link:${collection.key}:${productKey}`);
			await insertModuleData(
				client,
				"collections",
				"collectionProduct",
				linkId,
				{
					id: linkId,
					collectionId: collectionIds[collection.key],
					productId: productIds[productKey],
					position,
					addedAt: now,
				},
			);
		}
	}
}

async function seedBrands(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating house brand...");
	const brandId = uuid(`brand:${houseBrand.key}`);
	await insertModuleData(client, "brands", "brand", brandId, {
		id: brandId,
		name: houseBrand.name,
		slug: houseBrand.slug,
		description: houseBrand.description,
		logo: await assets.resolveUrl(houseBrand.logoPath),
		bannerImage: await assets.resolveUrl(houseBrand.bannerImagePath),
		website: houseBrand.website,
		isActive: houseBrand.isActive,
		isFeatured: houseBrand.isFeatured,
		position: houseBrand.position,
		seoTitle: houseBrand.seoTitle,
		seoDescription: houseBrand.seoDescription,
		createdAt: now,
		updatedAt: now,
	});

	for (const product of products) {
		const linkId = uuid(`brand-product:${houseBrand.key}:${product.key}`);
		await insertModuleData(client, "brands", "brandProduct", linkId, {
			id: linkId,
			brandId,
			productId: productIds[product.key],
			assignedAt: now,
		});
	}
}

async function seedCustomers(client: pg.PoolClient) {
	console.log("  Creating customers...");
	for (const customer of customers) {
		await insertModuleData(client, "customers", "customer", customerIds[customer.key], {
			id: customerIds[customer.key],
			email: customer.email,
			firstName: customer.firstName,
			lastName: customer.lastName,
			phone: customer.phone,
			metadata: customer.preferences ?? {},
			createdAt: now,
			updatedAt: now,
		});
	}

	for (const [index, address] of customerAddresses.entries()) {
		const addressId = uuid(`customer-address:${address.customerKey}:${index}`);
		await insertModuleData(client, "customers", "customerAddress", addressId, {
			id: addressId,
			customerId: customerIds[address.customerKey],
			type: address.type,
			firstName: address.firstName,
			lastName: address.lastName,
			line1: address.line1,
			...(address.line2 != null && { line2: address.line2 }),
			city: address.city,
			state: address.state,
			postalCode: address.postalCode,
			country: address.country,
			isDefault: address.isDefault,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedSettings(client: pg.PoolClient) {
	console.log("  Creating store settings...");
	for (const setting of storeSettings) {
		const settingId = uuid(`setting:${setting.key}`);
		await insertModuleData(client, "settings", "storeSetting", settingId, {
			id: settingId,
			key: setting.key,
			value: setting.value,
			group: setting.group,
			updatedAt: now,
		});
	}
}

async function seedInventory(client: pg.PoolClient) {
	console.log("  Creating inventory records...");
	for (const product of products) {
		const productId = productIds[product.key];
		const quantity = product.variants.reduce((sum, variant) => sum + variant.inventory, 0);
		const inventoryId = inventoryItemId(productId);
		await insertModuleData(client, "inventory", "inventoryItem", inventoryId, {
			id: inventoryId,
			productId,
			quantity,
			reserved: 0,
			allowBackorder: product.allowBackorder,
			lowStockThreshold: 4,
			createdAt: now,
			updatedAt: now,
		});

		for (const variant of product.variants) {
			const variantId = variantIdByKey[variant.key];
			const variantInventoryId = inventoryItemId(productId, variantId);
			await insertModuleData(
				client,
				"inventory",
				"inventoryItem",
				variantInventoryId,
				{
					id: variantInventoryId,
					productId,
					variantId,
					quantity: variant.inventory,
					reserved: 0,
					allowBackorder: product.allowBackorder,
					lowStockThreshold: 2,
					createdAt: now,
					updatedAt: now,
				},
			);
		}
	}
}

async function seedNavigation(client: pg.PoolClient) {
	console.log("  Creating navigation menu...");
	const menuId = uuid("menu:main");
	await insertModuleData(client, "navigation", "menu", menuId, {
		id: menuId,
		name: "Main Navigation",
		slug: "main",
		location: "header",
		isActive: true,
		metadata: { theme: summary.house },
		createdAt: now,
		updatedAt: now,
	});

	for (const item of navigationItems) {
		const itemId = uuid(`menu-item:${menuId}:${item.label}`);
		await insertModuleData(client, "navigation", "menuItem", itemId, {
			id: itemId,
			menuId,
			label: item.label,
			type: "link",
			url: item.url,
			position: item.position,
			isVisible: true,
			openInNewTab: false,
			metadata: {},
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedDemoOrder(client: pg.PoolClient) {
	console.log("  Creating demo order...");
	const orderId = uuid("order:demo");
	const orderItems = demoOrder.items.map((item) => {
		const product = productByKey[item.productKey];
		const variant = variantByKey[item.variantKey];
		return {
			id: uuid(`order-item:${item.variantKey}`),
			orderId,
			productId: productIds[item.productKey],
			variantId: variantIdByKey[item.variantKey],
			name: product.name,
			sku: variant?.sku ?? product.sku,
			price: variant?.price ?? product.price,
			quantity: item.quantity,
			subtotal: (variant?.price ?? product.price) * item.quantity,
			metadata: { options: variant?.options ?? {} },
		};
	});
	const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
	const total =
		subtotal + demoOrder.taxAmount + demoOrder.shippingAmount - demoOrder.discountAmount;

	await insertModuleData(client, "orders", "order", orderId, {
		id: orderId,
		orderNumber: demoOrder.orderNumber,
		customerId: customerIds[demoOrder.customerKey],
		subtotal,
		taxAmount: demoOrder.taxAmount,
		shippingAmount: demoOrder.shippingAmount,
		discountAmount: demoOrder.discountAmount,
		giftCardAmount: 0,
		total,
		currency: demoOrder.currency,
		status: demoOrder.status,
		paymentStatus: demoOrder.paymentStatus,
		metadata: { theme: summary.house },
		createdAt: now,
		updatedAt: now,
	});

	for (const item of orderItems) {
		await insertModuleData(client, "orders", "orderItem", item.id, item);
	}

	const addressId = uuid("order-address:demo");
	await insertModuleData(client, "orders", "orderAddress", addressId, {
		id: addressId,
		orderId,
		type: "shipping",
		...demoOrder.shippingAddress,
	});
}

async function seedReviews(client: pg.PoolClient) {
	console.log("  Creating reviews...");
	for (const review of reviews) {
		const reviewId = uuid(`review:${review.productKey}:${review.authorEmail}`);
		await insertModuleData(client, "reviews", "review", reviewId, {
			id: reviewId,
			productId: productIds[review.productKey],
			...(review.customerKey != null && {
				customerId: customerIds[review.customerKey],
			}),
			authorName: review.authorName,
			authorEmail: review.authorEmail,
			rating: review.rating,
			title: review.title,
			body: review.body,
			status: review.status,
			isVerifiedPurchase: review.isVerifiedPurchase,
			helpfulCount: 0,
			images: [],
			...(review.merchantResponse != null && {
				merchantResponse: review.merchantResponse,
				merchantResponseAt: now,
			}),
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedBlog(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating journal posts...");
	for (const post of blogPosts) {
		await insertModuleData(client, "blog", "post", blogPostIds[post.key], {
			id: blogPostIds[post.key],
			title: post.title,
			slug: post.slug,
			content: post.content,
			excerpt: post.excerpt,
			coverImage: await assets.resolveUrl(post.coverImagePath),
			author: post.author,
			category: post.category,
			status: post.status,
			featured: post.featured,
			readingTime: post.readingTime,
			tags: post.tags,
			metaTitle: post.metaTitle,
			metaDescription: post.metaDescription,
			views: 0,
			publishedAt: now,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedPages(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating pages...");
	for (const page of pages) {
		await insertModuleData(client, "pages", "page", pageIds[page.key], {
			id: pageIds[page.key],
			title: page.title,
			slug: page.slug,
			content: page.content,
			excerpt: page.excerpt,
			status: page.status,
			metaTitle: page.metaTitle,
			metaDescription: page.metaDescription,
			featuredImage: await assets.resolveUrl(page.featuredImagePath),
			position: page.position,
			showInNavigation: page.showInNavigation,
			publishedAt: now,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedShipping(client: pg.PoolClient) {
	console.log("  Creating shipping zones and rates...");
	for (const zone of shippingZones) {
		await insertModuleData(client, "shipping", "shippingZone", shippingZoneIds[zone.key], {
			id: shippingZoneIds[zone.key],
			name: zone.name,
			countries: zone.countries,
			isActive: zone.isActive,
			createdAt: now,
			updatedAt: now,
		});
	}

	for (const rate of shippingRates) {
		const rateId = uuid(`shipping-rate:${rate.key}`);
		await insertModuleData(client, "shipping", "shippingRate", rateId, {
			id: rateId,
			zoneId: shippingZoneIds[rate.zoneKey],
			name: rate.name,
			price: rate.price,
			minOrderAmount: rate.minOrderAmount,
			isActive: rate.isActive,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedTax(client: pg.PoolClient) {
	console.log("  Creating tax data...");
	for (const rate of taxRates) {
		await insertModuleData(client, "tax", "taxRate", uuid(`tax-rate:${rate.key}`), {
			id: uuid(`tax-rate:${rate.key}`),
			name: rate.name,
			country: rate.country,
			state: rate.state,
			city: rate.city,
			postalCode: rate.postalCode,
			rate: rate.rate,
			type: rate.type,
			categoryId: taxCategory.key,
			enabled: rate.enabled,
			priority: rate.priority,
			compound: rate.compound,
			inclusive: rate.inclusive,
			createdAt: now,
			updatedAt: now,
		});
	}

	await insertModuleData(client, "tax", "taxCategory", taxCategory.key, {
		id: taxCategory.key,
		name: taxCategory.name,
		description: taxCategory.description,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedDiscounts(client: pg.PoolClient) {
	console.log("  Creating discounts...");
	for (const discount of discounts) {
		const discountId = uuid(`discount:${discount.key}`);
		await insertModuleData(client, "discounts", "discount", discountId, {
			id: discountId,
			name: discount.name,
			description: discount.description,
			type: discount.type,
			value: discount.value,
			minimumAmount: discount.minimumAmount,
			appliesTo: discount.appliesTo,
			stackable: discount.stackable,
			usedCount: 0,
			isActive: discount.isActive,
			metadata: { theme: summary.house },
			createdAt: now,
			updatedAt: now,
		});

		const codeId = uuid(`discount-code:${discount.key}`);
		await insertModuleData(client, "discounts", "discountCode", codeId, {
			id: codeId,
			discountId,
			code: discount.code,
			usedCount: 0,
			isActive: discount.isActive,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedFaq(client: pg.PoolClient) {
	console.log("  Creating FAQ...");
	for (const category of faqCategories) {
		await insertModuleData(client, "faq", "faqCategory", faqCategoryIds[category.key], {
			id: faqCategoryIds[category.key],
			name: category.name,
			slug: category.slug,
			description: category.description,
			position: category.position,
			isVisible: true,
			metadata: {},
			createdAt: now,
			updatedAt: now,
		});
	}

	for (const item of faqItems) {
		const itemId = uuid(`faq-item:${item.slug}`);
		await insertModuleData(client, "faq", "faqItem", itemId, {
			id: itemId,
			categoryId: faqCategoryIds[item.categoryKey],
			question: item.question,
			answer: item.answer,
			slug: item.slug,
			position: item.position,
			isVisible: true,
			tags: [],
			helpfulCount: 0,
			notHelpfulCount: 0,
			metadata: {},
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedAnnouncements(client: pg.PoolClient) {
	console.log("  Creating announcement...");
	const announcementId = uuid("announcement:atelier");
	await insertModuleData(client, "announcements", "announcement", announcementId, {
		id: announcementId,
		...announcement,
		impressions: 0,
		clicks: 0,
		dismissals: 0,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedSeo(client: pg.PoolClient) {
	console.log("  Creating SEO metadata...");
	for (const meta of seoMeta) {
		const metaId = uuid(`seo:${meta.path}`);
		await insertModuleData(client, "seo", "metaTag", metaId, {
			id: metaId,
			...meta,
			noIndex: "false",
			noFollow: "false",
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedSearch(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating search index...");
	const resolvedProducts = await resolveProducts(assets);
	for (const product of resolvedProducts) {
		const indexId = uuid(`search-index:${product.key}`);
		await insertModuleData(client, "search", "searchIndex", indexId, {
			id: indexId,
			entityType: "product",
			entityId: product.id,
			title: product.name,
			body: product.description,
			tags: product.tags,
			url: `/products/${product.slug}`,
			image: product.images[0],
			metadata: {
				price: product.price,
				sku: product.sku,
				category: product.categoryKey,
				brand: houseBrand.name,
			},
			indexedAt: now,
		});
	}

	for (const synonym of searchSynonyms) {
		const synonymId = uuid(`search-synonym:${synonym.term}`);
		await insertModuleData(client, "search", "searchSynonym", synonymId, {
			id: synonymId,
			term: synonym.term,
			synonyms: synonym.synonyms,
			createdAt: now,
		});
	}
}

async function seedNewsletter(client: pg.PoolClient) {
	console.log("  Creating newsletter subscribers...");
	for (const subscriber of newsletterSubscribers) {
		const subscriberId = uuid(`newsletter:${subscriber.email}`);
		await insertModuleData(client, "newsletter", "subscriber", subscriberId, {
			id: subscriberId,
			...subscriber,
			tags: ["atelier"],
			metadata: {},
			subscribedAt: now,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedSocialProof(client: pg.PoolClient, assets: AssetResolver) {
	console.log("  Creating social proof...");
	for (const badge of trustBadges) {
		const badgeId = uuid(`trust-badge:${badge.name}`);
		await insertModuleData(client, "social-proof", "trustBadge", badgeId, {
			id: badgeId,
			...badge,
			createdAt: now,
			updatedAt: now,
		});
	}

	const resolvedProducts = await resolveProducts(assets);
	const productImageByKey = Object.fromEntries(
		resolvedProducts.map((product) => [product.key, product.images[0]]),
	) as Record<string, string>;

	for (const event of activityEvents) {
		const product = productByKey[event.productKey];
		const eventId = uuid(`activity-event:${event.productKey}:${event.city}`);
		await insertModuleData(client, "social-proof", "activityEvent", eventId, {
			id: eventId,
			productId: productIds[event.productKey],
			productName: product.name,
			productSlug: product.slug,
			productImage: productImageByKey[event.productKey],
			eventType: event.eventType,
			region: event.region,
			country: event.country,
			city: event.city,
			quantity: event.quantity,
			createdAt: now,
		});
	}
}

async function seedProductLabels(client: pg.PoolClient) {
	console.log("  Creating product labels...");
	for (const label of productLabels) {
		await insertModuleData(client, "product-labels", "label", labelIds[label.key], {
			id: labelIds[label.key],
			name: label.name,
			slug: label.slug,
			displayText: label.displayText,
			type: label.type,
			color: label.color,
			backgroundColor: label.backgroundColor,
			priority: label.priority,
			isActive: label.isActive,
			createdAt: now,
			updatedAt: now,
		});
	}

	for (const [labelKey, productKeys] of Object.entries(labelAssignments)) {
		for (const [position, productKey] of productKeys.entries()) {
			const linkId = uuid(`label-assignment:${labelKey}:${productKey}`);
			await insertModuleData(client, "product-labels", "productLabel", linkId, {
				id: linkId,
				productId: productIds[productKey],
				labelId: labelIds[labelKey],
				position: String(position),
				assignedAt: now,
			});
		}
	}
}

async function seedRedirects(client: pg.PoolClient) {
	console.log("  Creating redirects...");
	for (const redirect of redirects) {
		const redirectId = uuid(`redirect:${redirect.sourcePath}`);
		await insertModuleData(client, "redirects", "redirect", redirectId, {
			id: redirectId,
			...redirect,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedSitemap(client: pg.PoolClient) {
	console.log("  Creating sitemap config...");
	const configId = uuid("sitemap-config");
	await insertModuleData(client, "sitemap", "sitemapConfig", configId, {
		id: configId,
		...sitemapConfig,
		lastGenerated: now,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedWishlist(client: pg.PoolClient) {
	console.log("  Creating wishlist items...");

	const wishlists: Array<{
		customerKey: string;
		email: string;
		productKey: string;
		note?: string;
	}> = [
		{
			customerKey: "eleanor-vale",
			email: "eleanor@example.com",
			productKey: "regent-penny-loafer",
			note: "Perfect for Paris.",
		},
		{
			customerKey: "eleanor-vale",
			email: "eleanor@example.com",
			productKey: "montclair-chelsea-boot",
		},
		{
			customerKey: "marcus-chen",
			email: "marcus@example.com",
			productKey: "sable-slingback-pump",
		},
		{
			customerKey: "sofia-alvarez",
			email: "sofia@example.com",
			productKey: "regent-penny-loafer",
		},
	];

	for (const entry of wishlists) {
		const product = productByKey[entry.productKey];
		if (!product) continue;
		const itemId = uuid(`wishlist:${entry.customerKey}:${entry.productKey}`);
		await insertModuleData(client, "wishlist", "wishlistItem", itemId, {
			id: itemId,
			customerId: customerIds[entry.customerKey],
			customerEmail: entry.email,
			productId: productIds[entry.productKey],
			productName: product.name,
			...(entry.note ? { note: entry.note } : {}),
			addedAt: now,
		});
	}
}

async function seedLoyalty(client: pg.PoolClient) {
	console.log("  Creating loyalty accounts...");

	const accounts = [
		{
			customerKey: "eleanor-vale",
			tier: "gold" as const,
			lifetimeEarned: 2450,
			lifetimeRedeemed: 200,
		},
		{
			customerKey: "marcus-chen",
			tier: "silver" as const,
			lifetimeEarned: 890,
			lifetimeRedeemed: 0,
		},
		{
			customerKey: "sofia-alvarez",
			tier: "bronze" as const,
			lifetimeEarned: 165,
			lifetimeRedeemed: 0,
		},
	];

	for (const entry of accounts) {
		const accountId = uuid(`loyalty-account:${entry.customerKey}`);
		await insertModuleData(client, "loyalty", "loyaltyAccount", accountId, {
			id: accountId,
			customerId: customerIds[entry.customerKey],
			balance: entry.lifetimeEarned - entry.lifetimeRedeemed,
			lifetimeEarned: entry.lifetimeEarned,
			lifetimeRedeemed: entry.lifetimeRedeemed,
			tier: entry.tier,
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedFlashSales(client: pg.PoolClient) {
	console.log("  Creating flash sale...");

	const saleStartsAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
	const saleEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

	const saleId = uuid("flash-sale:weekend-edit");
	await insertModuleData(client, "flash-sales", "flashSale", saleId, {
		id: saleId,
		name: "Atelier Weekend Edit",
		slug: "weekend-edit",
		description: "Selected house pieces at exclusive prices, this weekend only.",
		status: "active",
		startsAt: saleStartsAt,
		endsAt: saleEndsAt,
		createdAt: now,
		updatedAt: now,
	});

	const saleProducts: Array<{ productKey: string; discountPct: number; order: number }> = [
		{ productKey: "regent-penny-loafer", discountPct: 20, order: 0 },
		{ productKey: "montclair-chelsea-boot", discountPct: 15, order: 1 },
	];

	for (const { productKey, discountPct, order } of saleProducts) {
		const product = productByKey[productKey];
		if (!product) continue;
		const saleProductId = uuid(`flash-sale-product:weekend-edit:${productKey}`);
		const originalPrice = product.price;
		const salePrice = Math.round(originalPrice * (1 - discountPct / 100));
		await insertModuleData(client, "flash-sales", "flashSaleProduct", saleProductId, {
			id: saleProductId,
			flashSaleId: saleId,
			productId: productIds[productKey],
			salePrice,
			originalPrice,
			stockLimit: 20,
			stockSold: 0,
			sortOrder: order,
			createdAt: now,
		});
	}
}

async function seedSubscriptions(client: pg.PoolClient) {
	console.log("  Creating subscription plans and subscribers...");

	const planId = uuid("subscription-plan:atelier-privilege");
	await insertModuleData(client, "subscriptions", "subscriptionPlan", planId, {
		id: planId,
		name: "Atelier Privilege",
		description:
			"Early access to new arrivals, exclusive member pricing, and complimentary alterations on every order.",
		price: 15000,
		currency: "USD",
		interval: "month",
		intervalCount: 1,
		trialDays: 14,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	const periodStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
	const periodEnd = new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString();

	const subscribers = [
		{ customerKey: "eleanor-vale", email: "eleanor@example.com" },
		{ customerKey: "marcus-chen", email: "marcus@example.com" },
	];

	for (const { customerKey, email } of subscribers) {
		const subId = uuid(`subscription:${customerKey}:atelier-privilege`);
		await insertModuleData(client, "subscriptions", "subscription", subId, {
			id: subId,
			planId,
			customerId: customerIds[customerKey],
			email,
			status: "active",
			currentPeriodStart: periodStart,
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: false,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedBundles(client: pg.PoolClient) {
	console.log("  Creating product bundles...");

	const bundleId = uuid("bundle:atelier-weekend");
	await insertModuleData(client, "bundles", "bundle", bundleId, {
		id: bundleId,
		name: "Weekend Atelier Bundle",
		slug: "weekend-atelier",
		description:
			"Our most versatile pairing — the Regent Penny Loafer and Montclair Chelsea Boot. Two house signatures, dressed together.",
		status: "active",
		discountType: "percentage",
		discountValue: 12,
		minQuantity: 2,
		sortOrder: 0,
		createdAt: now,
		updatedAt: now,
	});

	const bundleProducts: Array<{ productKey: string; quantity: number; sortOrder: number }> = [
		{ productKey: "regent-penny-loafer", quantity: 1, sortOrder: 0 },
		{ productKey: "montclair-chelsea-boot", quantity: 1, sortOrder: 1 },
	];

	for (const { productKey, quantity, sortOrder } of bundleProducts) {
		const product = productByKey[productKey];
		if (!product) continue;
		const itemId = uuid(`bundle-item:atelier-weekend:${productKey}`);
		await insertModuleData(client, "bundles", "bundleItem", itemId, {
			id: itemId,
			bundleId,
			productId: productIds[productKey],
			quantity,
			sortOrder,
			productName: product.name,
			productSlug: product.slug,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedStoreLocator(client: pg.PoolClient) {
	console.log("  Creating store locations...");
	for (const location of storeLocations) {
		await insertModuleData(client, "store-locator", "location", locationIds[location.key], {
			id: locationIds[location.key],
			...location,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedStorePickup(client: pg.PoolClient) {
	console.log("  Creating pickup windows...");
	const pickupLocationId = uuid("pickup-location:flagship");
	await insertModuleData(client, "store-pickup", "pickupLocation", pickupLocationId, {
		id: pickupLocationId,
		...pickupLocation,
		createdAt: now,
		updatedAt: now,
	});

	for (const [index, window] of pickupWindows.entries()) {
		const windowId = uuid(`pickup-window:${index}`);
		await insertModuleData(client, "store-pickup", "pickupWindow", windowId, {
			id: windowId,
			locationId: pickupLocationId,
			...window,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedDeliverySlots(client: pg.PoolClient) {
	console.log("  Creating delivery schedules...");
	for (const schedule of deliverySchedules) {
		const scheduleId = uuid(`delivery-slot:${schedule.name}`);
		await insertModuleData(client, "delivery-slots", "deliverySchedule", scheduleId, {
			id: scheduleId,
			...schedule,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedGiftCards(client: pg.PoolClient) {
	console.log("  Creating gift cards...");

	const orderId = uuid("order:demo");

	const cards = [
		{
			key: "gc:eleanor-250",
			code: "GIFT-VALE-8801-ATRL",
			initialBalance: 25000,
			currentBalance: 25000,
			currency: "USD",
			status: "active",
			recipientEmail: "eleanor@example.com",
			recipientName: "Eleanor Vale",
			customerId: customerIds["eleanor-vale"],
			purchasedByCustomerId: customerIds["marcus-chen"],
			senderName: "Marcus Chen",
			senderEmail: "marcus@example.com",
			message: "Enjoy the new collection.",
			deliveryMethod: "email",
			delivered: true,
			deliveredAt: now,
		},
		{
			key: "gc:marcus-200",
			code: "GIFT-CHEN-2024-ATLR",
			initialBalance: 20000,
			currentBalance: 10000,
			currency: "USD",
			status: "active",
			recipientEmail: "marcus@example.com",
			recipientName: "Marcus Chen",
			customerId: customerIds["marcus-chen"],
			deliveryMethod: "email",
			delivered: true,
			deliveredAt: now,
		},
		{
			key: "gc:sofia-50",
			code: "GIFT-ALVZ-5050-ATRL",
			initialBalance: 5000,
			currentBalance: 0,
			currency: "USD",
			status: "depleted",
			recipientEmail: "sofia@example.com",
			recipientName: "Sofia Alvarez",
			customerId: customerIds["sofia-alvarez"],
			deliveryMethod: "email",
			delivered: true,
			deliveredAt: now,
		},
	];

	const cardIds: Record<string, string> = {};
	for (const card of cards) {
		const cardId = uuid(card.key);
		cardIds[card.key] = cardId;
		const { key: _key, ...cardData } = card;
		await insertModuleData(client, "gift-cards", "giftCard", cardId, {
			id: cardId,
			...cardData,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Transaction: Marcus's card — $100 redemption on the demo order
	const txId1 = uuid("gc-tx:marcus-200:debit-1");
	await insertModuleData(client, "gift-cards", "giftCardTransaction", txId1, {
		id: txId1,
		giftCardId: cardIds["gc:marcus-200"],
		type: "debit",
		amount: 10000,
		balanceAfter: 10000,
		orderId,
		customerId: customerIds["marcus-chen"],
		note: "Applied to order AT-1001",
		createdAt: now,
	});

	// Transaction: Sofia's card — fully depleted
	const txId2 = uuid("gc-tx:sofia-50:debit-1");
	await insertModuleData(client, "gift-cards", "giftCardTransaction", txId2, {
		id: txId2,
		giftCardId: cardIds["gc:sofia-50"],
		type: "debit",
		amount: 5000,
		balanceAfter: 0,
		customerId: customerIds["sofia-alvarez"],
		createdAt: now,
	});
}

async function seedAppointments(client: pg.PoolClient) {
	console.log("  Creating appointment services and bookings...");

	const personalShoppingId = uuid("appointment-service:personal-shopping");
	const alterationsId = uuid("appointment-service:alterations");
	const claireId = uuid("appointment-staff:claire-dubois");
	const antoineId = uuid("appointment-staff:antoine-moreau");

	await insertModuleData(client, "appointments", "service", personalShoppingId, {
		id: personalShoppingId,
		name: "Personal Shopping",
		slug: "personal-shopping",
		description:
			"A private session with our in-house stylist. We curate a selection based on your style profile before you arrive.",
		duration: 60,
		price: 0,
		currency: "USD",
		status: "active",
		maxCapacity: 1,
		sortOrder: 0,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "appointments", "service", alterationsId, {
		id: alterationsId,
		name: "Alterations Consultation",
		slug: "alterations-consultation",
		description:
			"Meet with our master tailor to discuss bespoke adjustments and fit corrections for any garment.",
		duration: 45,
		price: 0,
		currency: "USD",
		status: "active",
		maxCapacity: 1,
		sortOrder: 1,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "appointments", "staff", claireId, {
		id: claireId,
		name: "Claire Dubois",
		email: "claire@86d-atelier.com",
		bio: "Senior stylist with 12 years at the Atelier. Specialises in wardrobe curation and occasion dressing.",
		status: "active",
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "appointments", "staff", antoineId, {
		id: antoineId,
		name: "Antoine Moreau",
		email: "antoine@86d-atelier.com",
		bio: "Master tailor trained in Paris. Handles bespoke alterations, monogramming, and custom commissions.",
		status: "active",
		createdAt: now,
		updatedAt: now,
	});

	// Claire handles personal shopping; Antoine handles alterations
	await insertModuleData(client, "appointments", "staffService", uuid("staff-svc:claire:ps"), {
		id: uuid("staff-svc:claire:ps"),
		staffId: claireId,
		serviceId: personalShoppingId,
		createdAt: now,
	});
	await insertModuleData(client, "appointments", "staffService", uuid("staff-svc:antoine:alt"), {
		id: uuid("staff-svc:antoine:alt"),
		staffId: antoineId,
		serviceId: alterationsId,
		createdAt: now,
	});

	// Weekly schedule: Mon–Fri 10:00–18:00 for Claire
	const weekdays = [1, 2, 3, 4, 5];
	for (const day of weekdays) {
		const schedId = uuid(`schedule:claire:${day}`);
		await insertModuleData(client, "appointments", "schedule", schedId, {
			id: schedId,
			staffId: claireId,
			dayOfWeek: day,
			startTime: "10:00",
			endTime: "18:00",
			createdAt: now,
		});
	}

	// Tue–Sat 11:00–19:00 for Antoine
	const antoineDays = [2, 3, 4, 5, 6];
	for (const day of antoineDays) {
		const schedId = uuid(`schedule:antoine:${day}`);
		await insertModuleData(client, "appointments", "schedule", schedId, {
			id: schedId,
			staffId: antoineId,
			dayOfWeek: day,
			startTime: "11:00",
			endTime: "19:00",
			createdAt: now,
		});
	}

	// Upcoming confirmed appointment: Eleanor with Claire (personal shopping)
	const eleanorApptId = uuid("appointment:eleanor:personal-shopping");
	const eleanorStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
	const eleanorEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();
	await insertModuleData(client, "appointments", "appointment", eleanorApptId, {
		id: eleanorApptId,
		serviceId: personalShoppingId,
		staffId: claireId,
		customerId: customerIds["eleanor-vale"],
		customerName: "Eleanor Vale",
		customerEmail: "eleanor@example.com",
		startsAt: eleanorStart,
		endsAt: eleanorEnd,
		status: "confirmed",
		price: 0,
		currency: "USD",
		createdAt: now,
		updatedAt: now,
	});

	// Upcoming confirmed appointment: Marcus with Antoine (alterations)
	const marcusApptId = uuid("appointment:marcus:alterations");
	const marcusStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
	const marcusEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString();
	await insertModuleData(client, "appointments", "appointment", marcusApptId, {
		id: marcusApptId,
		serviceId: alterationsId,
		staffId: antoineId,
		customerId: customerIds["marcus-chen"],
		customerName: "Marcus Chen",
		customerEmail: "marcus@example.com",
		startsAt: marcusStart,
		endsAt: marcusEnd,
		status: "confirmed",
		price: 0,
		currency: "USD",
		createdAt: now,
		updatedAt: now,
	});
}

async function seedMemberships(client: pg.PoolClient) {
	console.log("  Creating membership plans and members...");

	const clubPlanId = uuid("membership-plan:atelier-club");
	const maisonPlanId = uuid("membership-plan:atelier-maison");

	await insertModuleData(client, "memberships", "membershipPlan", clubPlanId, {
		id: clubPlanId,
		name: "Atelier Club",
		slug: "atelier-club",
		description:
			"Monthly membership for the discerning shopper. Priority access, complimentary alterations, and exclusive member events.",
		price: 9900,
		billingInterval: "month",
		trialDays: 0,
		features: ["10% off all purchases", "Free standard shipping", "Early access to new arrivals"],
		isActive: true,
		maxMembers: null,
		sortOrder: 0,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "memberships", "membershipPlan", maisonPlanId, {
		id: maisonPlanId,
		name: "Atelier Maison",
		slug: "atelier-maison",
		description:
			"Annual membership for our most valued clients. Includes all Club benefits plus a personal stylist, bespoke services, and invitations to private previews.",
		price: 79900,
		billingInterval: "year",
		trialDays: 0,
		features: [
			"20% off all purchases",
			"Free express shipping",
			"Priority personal stylist access",
			"Exclusive Maison preview events",
			"Complimentary monogramming",
		],
		isActive: true,
		maxMembers: 50,
		sortOrder: 1,
		createdAt: now,
		updatedAt: now,
	});

	// Benefits
	const clubBenefits = [
		{ type: "discount", value: "10", description: "10% off all full-price items" },
		{ type: "shipping", value: "free_standard", description: "Free standard shipping on all orders" },
		{ type: "access", value: "early_access", description: "48-hour early access to new arrivals" },
	];
	for (const [i, benefit] of clubBenefits.entries()) {
		const benefitId = uuid(`membership-benefit:club:${i}`);
		await insertModuleData(client, "memberships", "membershipBenefit", benefitId, {
			id: benefitId,
			planId: clubPlanId,
			...benefit,
			isActive: true,
			createdAt: now,
		});
	}

	const maisonBenefits = [
		{ type: "discount", value: "20", description: "20% off all full-price items" },
		{ type: "shipping", value: "free_express", description: "Free express shipping on all orders" },
		{ type: "stylist", value: "personal_stylist", description: "Access to personal stylist consultations" },
		{ type: "access", value: "maison_events", description: "Invitations to Maison private previews" },
		{ type: "service", value: "monogramming", description: "Complimentary monogramming on all orders" },
	];
	for (const [i, benefit] of maisonBenefits.entries()) {
		const benefitId = uuid(`membership-benefit:maison:${i}`);
		await insertModuleData(client, "memberships", "membershipBenefit", benefitId, {
			id: benefitId,
			planId: maisonPlanId,
			...benefit,
			isActive: true,
			createdAt: now,
		});
	}

	// Members: Eleanor → Maison, Marcus → Club
	const membershipStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
	const membershipEnd = new Date(Date.now() + 320 * 24 * 60 * 60 * 1000).toISOString();
	const clubEnd = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString();

	const eleanorMembershipId = uuid("membership:eleanor:maison");
	await insertModuleData(client, "memberships", "membership", eleanorMembershipId, {
		id: eleanorMembershipId,
		customerId: customerIds["eleanor-vale"],
		planId: maisonPlanId,
		status: "active",
		startDate: membershipStart,
		endDate: membershipEnd,
		createdAt: now,
		updatedAt: now,
	});

	const marcusMembershipId = uuid("membership:marcus:club");
	await insertModuleData(client, "memberships", "membership", marcusMembershipId, {
		id: marcusMembershipId,
		customerId: customerIds["marcus-chen"],
		planId: clubPlanId,
		status: "active",
		startDate: membershipStart,
		endDate: clubEnd,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedWarranties(client: pg.PoolClient) {
	console.log("  Creating warranty plans and registrations...");

	const manufacturerPlanId = uuid("warranty-plan:manufacturer-12");
	const extendedPlanId = uuid("warranty-plan:atelier-protection-24");

	await insertModuleData(client, "warranties", "warrantyPlan", manufacturerPlanId, {
		id: manufacturerPlanId,
		name: "Manufacturer Warranty",
		description: "Standard manufacturer coverage included with every Atelier purchase.",
		type: "manufacturer",
		durationMonths: 12,
		price: 0,
		coverageDetails:
			"Covers manufacturing defects in materials and workmanship. Does not cover normal wear or accidental damage.",
		exclusions: "Wear and tear, accidental damage, water damage, unauthorised repairs.",
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "warranties", "warrantyPlan", extendedPlanId, {
		id: extendedPlanId,
		name: "Atelier Protection Plan",
		description: "Extended 24-month protection covering accidental damage and wear on fine leather goods and timepieces.",
		type: "extended",
		durationMonths: 24,
		price: 4999,
		coverageDetails:
			"All manufacturer warranty coverage plus accidental damage, stitching failures, hardware defects, and complimentary annual conditioning service.",
		exclusions: "Loss or theft, intentional damage, alterations by third parties.",
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	const orderId = uuid("order:demo");
	const purchaseDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
	const manufacturerExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 365 * 24 * 60 * 60 * 1000).toISOString();
	const extendedExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

	// Manufacturer warranty on the Grand Tour Passport Folio from the demo order
	const folioWarrantyId = uuid("warranty-reg:marcus:folio:manufacturer");
	await insertModuleData(client, "warranties", "warrantyRegistration", folioWarrantyId, {
		id: folioWarrantyId,
		warrantyPlanId: manufacturerPlanId,
		orderId,
		customerId: customerIds["marcus-chen"],
		productId: productIds["grand-tour-passport-folio"],
		productName: "Grand Tour Passport Folio",
		purchaseDate,
		expiresAt: manufacturerExpiry,
		status: "active",
		createdAt: now,
		updatedAt: now,
	});

	// Extended protection on the Silk Twill Wrap from the demo order
	const wrapWarrantyId = uuid("warranty-reg:marcus:silk-wrap:extended");
	await insertModuleData(client, "warranties", "warrantyRegistration", wrapWarrantyId, {
		id: wrapWarrantyId,
		warrantyPlanId: extendedPlanId,
		orderId,
		customerId: customerIds["marcus-chen"],
		productId: productIds["silk-twill-wrap"],
		productName: "Silk Twill Wrap",
		purchaseDate,
		expiresAt: extendedExpiry,
		status: "active",
		createdAt: now,
		updatedAt: now,
	});
}

async function seedAuctions(client: pg.PoolClient) {
	console.log("  Creating auctions and bids...");

	const auctionId = uuid("auction:observatory-chronograph:steel-slate");
	const startsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
	const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

	await insertModuleData(client, "auctions", "auction", auctionId, {
		id: auctionId,
		title: "Observatory Chronograph — Steel / Slate Strap",
		description:
			"A single archive specimen from the Atelier's private collection. Unworn, complete with original box and papers. Available for the first time through live auction.",
		productId: productIds["observatory-chronograph"],
		productName: "Observatory Chronograph",
		type: "english",
		status: "active",
		startingPrice: 300000,
		reservePrice: 340000,
		buyNowPrice: 420000,
		bidIncrement: 5000,
		currentBid: 325000,
		bidCount: 3,
		highestBidderId: customerIds["eleanor-vale"],
		antiSnipingEnabled: true,
		antiSnipingMinutes: 5,
		startsAt,
		endsAt,
		createdAt: now,
		updatedAt: now,
	});

	// Bids in chronological order
	const bid1 = uuid("bid:auction-obs:marcus:1");
	const bid2 = uuid("bid:auction-obs:eleanor:1");
	const bid3 = uuid("bid:auction-obs:marcus:2");
	const bid4 = uuid("bid:auction-obs:eleanor:2");

	const bids = [
		{
			id: bid1,
			customerId: customerIds["marcus-chen"],
			customerName: "Marcus Chen",
			amount: 300000,
			isWinning: false,
			isAutoBid: false,
		},
		{
			id: bid2,
			customerId: customerIds["eleanor-vale"],
			customerName: "Eleanor Vale",
			amount: 305000,
			isWinning: false,
			isAutoBid: false,
		},
		{
			id: bid3,
			customerId: customerIds["marcus-chen"],
			customerName: "Marcus Chen",
			amount: 310000,
			isWinning: false,
			isAutoBid: false,
		},
		{
			id: bid4,
			customerId: customerIds["eleanor-vale"],
			customerName: "Eleanor Vale",
			amount: 325000,
			isWinning: true,
			isAutoBid: false,
		},
	];

	for (const bid of bids) {
		await insertModuleData(client, "auctions", "bid", bid.id, {
			...bid,
			auctionId,
			createdAt: now,
		});
	}
}

async function seedStoreCredits(client: pg.PoolClient) {
	console.log("  Creating store credit accounts...");

	const accounts = [
		{
			customerKey: "eleanor-vale",
			email: "eleanor@example.com",
			balance: 7500,
			lifetimeCredited: 12500,
			lifetimeDebited: 5000,
		},
		{
			customerKey: "marcus-chen",
			email: "marcus@example.com",
			balance: 12500,
			lifetimeCredited: 12500,
			lifetimeDebited: 0,
		},
	];

	for (const entry of accounts) {
		const accountId = uuid(`store-credit-account:${entry.customerKey}`);
		await insertModuleData(client, "store-credits", "creditAccount", accountId, {
			id: accountId,
			customerId: customerIds[entry.customerKey],
			customerEmail: entry.email,
			balance: entry.balance,
			lifetimeCredited: entry.lifetimeCredited,
			lifetimeDebited: entry.lifetimeDebited,
			currency: "USD",
			status: "active",
			createdAt: now,
			updatedAt: now,
		});

		// Initial credit transaction
		const txId = uuid(`store-credit-tx:${entry.customerKey}:initial`);
		await insertModuleData(client, "store-credits", "creditTransaction", txId, {
			id: txId,
			accountId,
			type: "credit",
			amount: entry.lifetimeCredited,
			balanceAfter: entry.lifetimeCredited,
			reason: "promotional",
			description: "Welcome credit — Atelier loyalty reward",
			createdAt: now,
		});

		// Debit transaction for Eleanor only
		if (entry.lifetimeDebited > 0) {
			const debitId = uuid(`store-credit-tx:${entry.customerKey}:debit-1`);
			const orderId = uuid("order:demo");
			await insertModuleData(client, "store-credits", "creditTransaction", debitId, {
				id: debitId,
				accountId,
				type: "debit",
				amount: entry.lifetimeDebited,
				balanceAfter: entry.balance,
				reason: "order_payment",
				description: "Applied to order AT-1001",
				referenceType: "order",
				referenceId: orderId,
				createdAt: now,
			});
		}
	}
}

async function seedPreorders(client: pg.PoolClient) {
	console.log("  Creating preorder campaigns...");

	const campaignId = uuid("preorder-campaign:cashmere-fringe-scarf");
	const campaignStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const campaignEnd = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
	const estimatedShip = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

	const cashmereScarf = productByKey["cashmere-fringe-scarf"];

	await insertModuleData(client, "preorders", "preorderCampaign", campaignId, {
		id: campaignId,
		productId: productIds["cashmere-fringe-scarf"],
		productName: cashmereScarf?.name ?? "Cashmere Fringe Scarf",
		status: "active",
		paymentType: "full",
		price: cashmereScarf?.price ?? 28500,
		maxQuantity: 30,
		currentQuantity: 2,
		startDate: campaignStart,
		endDate: campaignEnd,
		estimatedShipDate: estimatedShip,
		message:
			"Reserve your Autumn edition Cashmere Fringe Scarf before it arrives. Limited to 30 pieces worldwide.",
		createdAt: now,
		updatedAt: now,
	});

	const preorderItems = [
		{
			customerKey: "eleanor-vale",
			email: "eleanor@example.com",
		},
		{
			customerKey: "sofia-alvarez",
			email: "sofia@example.com",
		},
	];

	for (const entry of preorderItems) {
		const itemId = uuid(`preorder-item:${entry.customerKey}:cashmere-fringe-scarf`);
		await insertModuleData(client, "preorders", "preorderItem", itemId, {
			id: itemId,
			campaignId,
			customerId: customerIds[entry.customerKey],
			customerEmail: entry.email,
			quantity: 1,
			status: "confirmed",
			depositPaid: cashmereScarf?.price ?? 28500,
			totalPrice: cashmereScarf?.price ?? 28500,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedReferrals(client: pg.PoolClient) {
	console.log("  Creating referral codes and referrals...");

	// Reward rule
	const ruleId = uuid("referral-rule:default");
	await insertModuleData(client, "referrals", "rewardRule", ruleId, {
		id: ruleId,
		name: "Atelier Friend Referral",
		referrerRewardType: "store_credit",
		referrerRewardValue: 2500,
		refereeRewardType: "store_credit",
		refereeRewardValue: 1500,
		minOrderAmount: 10000,
		active: true,
		createdAt: now,
		updatedAt: now,
	});

	// Referral codes for each customer
	const refCodes = [
		{ customerKey: "eleanor-vale", email: "eleanor@example.com", code: "ELEANOR-ATELIER" },
		{ customerKey: "marcus-chen", email: "marcus@example.com", code: "MARCUS-ATELIER" },
		{ customerKey: "sofia-alvarez", email: "sofia@example.com", code: "SOFIA-ATELIER" },
	];

	const codeIds: Record<string, string> = {};
	for (const entry of refCodes) {
		const codeId = uuid(`referral-code:${entry.customerKey}`);
		codeIds[entry.customerKey] = codeId;
		await insertModuleData(client, "referrals", "referralCode", codeId, {
			id: codeId,
			customerId: customerIds[entry.customerKey],
			customerEmail: entry.email,
			code: entry.code,
			active: true,
			usageCount: entry.customerKey === "eleanor-vale" ? 1 : 0,
			maxUses: 0,
			createdAt: now,
		});
	}

	// Completed referral: Eleanor referred Sofia
	const referralId = uuid("referral:eleanor:sofia");
	await insertModuleData(client, "referrals", "referral", referralId, {
		id: referralId,
		referrerCodeId: codeIds["eleanor-vale"],
		referrerCustomerId: customerIds["eleanor-vale"],
		referrerEmail: "eleanor@example.com",
		refereeCustomerId: customerIds["sofia-alvarez"],
		refereeEmail: "sofia@example.com",
		status: "completed",
		referrerRewarded: true,
		refereeRewarded: true,
		completedAt: now,
		createdAt: now,
	});
}

async function seedAffiliates(client: pg.PoolClient) {
	console.log("  Creating affiliates and links...");

	const affiliates = [
		{
			key: "the-sartorial-edit",
			name: "The Sartorial Edit",
			email: "collab@thesartorialedit.com",
			website: "https://thesartorialedit.com",
			code: "SARTORIAL20",
			commissionRate: 12,
			status: "active",
			totalClicks: 842,
			totalConversions: 14,
			totalRevenue: 1240000,
			totalCommission: 148800,
			totalPaid: 100000,
		},
		{
			key: "curated-luxury-guide",
			name: "Curated Luxury Guide",
			email: "partnerships@curatedluxuryguide.com",
			website: "https://curatedluxuryguide.com",
			code: "CLG15",
			commissionRate: 10,
			status: "active",
			totalClicks: 376,
			totalConversions: 7,
			totalRevenue: 645000,
			totalCommission: 64500,
			totalPaid: 64500,
		},
	];

	for (const aff of affiliates) {
		const affId = uuid(`affiliate:${aff.key}`);
		const { key: _key, ...affData } = aff;
		await insertModuleData(client, "affiliates", "affiliate", affId, {
			id: affId,
			...affData,
			createdAt: now,
			updatedAt: now,
		});

		// One affiliate link per affiliate (homepage)
		const linkId = uuid(`affiliate-link:${aff.key}:home`);
		await insertModuleData(client, "affiliates", "affiliateLink", linkId, {
			id: linkId,
			affiliateId: affId,
			targetUrl: "/",
			slug: `${aff.code.toLowerCase()}-home`,
			clicks: aff.totalClicks,
			conversions: aff.totalConversions,
			revenue: aff.totalRevenue,
			active: true,
			createdAt: now,
		});

		// One conversion (latest order)
		const orderId = uuid("order:demo");
		const convId = uuid(`affiliate-conversion:${aff.key}:1`);
		await insertModuleData(client, "affiliates", "affiliateConversion", convId, {
			id: convId,
			affiliateId: affId,
			linkId,
			orderId,
			orderAmount: 157000,
			commissionRate: aff.commissionRate,
			commissionAmount: Math.round(157000 * aff.commissionRate) / 100,
			status: "approved",
			paidAt: now,
			createdAt: now,
		});
	}
}

async function seedCustomerGroups(client: pg.PoolClient) {
	console.log("  Creating customer groups...");

	const groups = [
		{
			key: "vip",
			name: "VIP",
			slug: "vip",
			description: "Top-tier clients with lifetime spend over $10,000 or by direct invitation.",
			type: "manual",
			priority: 10,
		},
		{
			key: "maison-members",
			name: "Maison Members",
			slug: "maison-members",
			description: "Active Atelier Maison annual membership holders.",
			type: "manual",
			priority: 5,
		},
		{
			key: "new-arrivals",
			name: "New Customers",
			slug: "new-customers",
			description: "Customers who have joined in the past 90 days.",
			type: "automatic",
			priority: 1,
		},
	];

	const groupIds: Record<string, string> = {};
	for (const group of groups) {
		const groupId = uuid(`customer-group:${group.key}`);
		groupIds[group.key] = groupId;
		const { key: _key, ...groupData } = group;
		await insertModuleData(client, "customer-groups", "customerGroup", groupId, {
			id: groupId,
			...groupData,
			isActive: true,
			metadata: {},
			createdAt: now,
			updatedAt: now,
		});
	}

	// Memberships: Eleanor → VIP + Maison Members, Marcus → Maison Members, Sofia → New Customers
	const memberships = [
		{ customerKey: "eleanor-vale", groupKey: "vip" },
		{ customerKey: "eleanor-vale", groupKey: "maison-members" },
		{ customerKey: "marcus-chen", groupKey: "maison-members" },
		{ customerKey: "sofia-alvarez", groupKey: "new-arrivals" },
	];

	for (const entry of memberships) {
		const membershipId = uuid(`group-membership:${entry.customerKey}:${entry.groupKey}`);
		await insertModuleData(client, "customer-groups", "groupMembership", membershipId, {
			id: membershipId,
			groupId: groupIds[entry.groupKey],
			customerId: customerIds[entry.customerKey],
			joinedAt: now,
			metadata: {},
		});
	}
}

async function seedAbandonedCarts(client: pg.PoolClient) {
	console.log("  Creating abandoned carts...");

	const softScarf = productByKey["cashmere-fringe-scarf"];
	const loafer = productByKey["regent-penny-loafer"];

	const cartItems = (product: typeof softScarf, variantKey: string) =>
		product
			? [
					{
						productId: productIds[product.slug],
						productName: product.name,
						variantId: uuid(`variant:${variantKey}`),
						variantLabel: "Truffle",
						quantity: 1,
						price: product.price,
						imageUrl: null,
					},
				]
			: [];

	// Active abandoned cart (Marcus left a loafer in his cart)
	const cart1Id = uuid("abandoned-cart:marcus:loafer");
	await insertModuleData(client, "abandoned-carts", "abandonedCart", cart1Id, {
		id: cart1Id,
		cartId: uuid("cart:marcus:session-1"),
		customerId: customerIds["marcus-chen"],
		email: "marcus@example.com",
		items: cartItems(loafer, "regent-penny-loafer:onx-42"),
		cartTotal: loafer?.price ?? 49500,
		currency: "USD",
		status: "active",
		recoveryToken: uuid("recovery-token:marcus:loafer").replace(/-/g, ""),
		attemptCount: 1,
		lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
		abandonedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
		metadata: {},
		createdAt: now,
		updatedAt: now,
	});

	// Recovered abandoned cart (Sofia recovered her scarf cart)
	const cart2Id = uuid("abandoned-cart:sofia:scarf");
	await insertModuleData(client, "abandoned-carts", "abandonedCart", cart2Id, {
		id: cart2Id,
		cartId: uuid("cart:sofia:session-2"),
		customerId: customerIds["sofia-alvarez"],
		email: "sofia@example.com",
		items: cartItems(softScarf, "cashmere-fringe-scarf:trf"),
		cartTotal: softScarf?.price ?? 28500,
		currency: "USD",
		status: "recovered",
		recoveryToken: uuid("recovery-token:sofia:scarf").replace(/-/g, ""),
		attemptCount: 2,
		lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		abandonedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		recoveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
		recoveredOrderId: uuid("order:demo"),
		metadata: {},
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: now,
	});
}

async function seedDigitalDownloads(client: pg.PoolClient) {
	console.log("  Creating digital downloads...");

	// Downloadable leather care guide linked to the Grand Tour Passport Folio
	const fileId = uuid("download-file:leather-care-guide");
	await insertModuleData(client, "digital-downloads", "downloadableFile", fileId, {
		id: fileId,
		productId: productIds["grand-tour-passport-folio"],
		name: "Atelier Leather Care Guide",
		url: "/downloads/86d-atelier-leather-care-guide.pdf",
		fileSize: 2048000,
		mimeType: "application/pdf",
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	// Download token for Marcus (purchased via demo order)
	const tokenId = uuid("download-token:marcus:leather-care-guide");
	const orderId = uuid("order:demo");
	await insertModuleData(client, "digital-downloads", "downloadToken", tokenId, {
		id: tokenId,
		token: uuid("token:marcus:leather-care-guide").replace(/-/g, ""),
		fileId,
		orderId,
		email: "marcus@example.com",
		maxDownloads: 5,
		downloadCount: 1,
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		createdAt: now,
		updatedAt: now,
	});
}

async function main() {
	console.log("🌱 Seeding 86d luxury demo database...\n");
	console.log(`  Store ID: ${STORE_ID}`);
	console.log(`  Database: ${DATABASE_URL?.replace(/\/\/.*@/, "//***@")}`);
	console.log(`  Asset root: ${ASSET_ROOT}\n`);

	const client = await pool.connect();
	const storage = createStorageFromEnv();
	const assets = createAssetResolver(storage);

	try {
		await client.query("BEGIN");

		await seedAdminUser(client);
		await seedModules(client);
		await resetManagedModuleData(client);
		await seedProducts(client, assets);
		await seedCollections(client, assets);
		await seedCollectionsModule(client, assets);
		await seedBrands(client, assets);
		await seedCustomers(client);
		await seedSettings(client);
		await seedInventory(client);
		await seedNavigation(client);
		await seedDemoOrder(client);
		await seedReviews(client);
		await seedBlog(client, assets);
		await seedPages(client, assets);
		await seedShipping(client);
		await seedTax(client);
		await seedDiscounts(client);
		await seedFaq(client);
		await seedAnnouncements(client);
		await seedSeo(client);
		await seedSearch(client, assets);
		await seedNewsletter(client);
		await seedSocialProof(client, assets);
		await seedProductLabels(client);
		await seedRedirects(client);
		await seedSitemap(client);
		await seedStoreLocator(client);
		await seedStorePickup(client);
		await seedDeliverySlots(client);
		await seedWishlist(client);
		await seedLoyalty(client);
		await seedFlashSales(client);
		await seedBundles(client);
		await seedSubscriptions(client);
		await seedGiftCards(client);
		await seedAppointments(client);
		await seedMemberships(client);
		await seedWarranties(client);
		await seedAuctions(client);
		await seedStoreCredits(client);
		await seedPreorders(client);
		await seedReferrals(client);
		await seedAffiliates(client);
		await seedCustomerGroups(client);
		await seedAbandonedCarts(client);
		await seedDigitalDownloads(client);

		await client.query("COMMIT");

		console.log("\n✅ Seed complete!");
		console.log("\n  Admin credentials:");
		console.log(`    Email:    ${ADMIN_EMAIL}`);
		console.log(`    Password: ${ADMIN_PASSWORD === "password123" ? "password123" : "(as entered)"}`);
		console.log(
			`\n  ${summary.productCount} products, ${summary.categoryCount} categories, ${summary.collectionCount} collections`,
		);
		console.log(`  ${products.reduce((sum, product) => sum + product.variants.length, 0)} variants`);
		console.log(`  ${customers.length} customers, 1 demo order, ${blogPosts.length} journal posts`);
		console.log(`  ${moduleNames.length} modules registered`);
		console.log(`  Assets uploaded under ${ASSET_KEY_PREFIX}\n`);
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("\n❌ Seed failed:", error);
		process.exit(1);
	} finally {
		client.release();
		await pool.end();
	}
}

main();
