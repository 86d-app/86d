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
 *   - Admin user (admin@example.com / password123)
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
	const hashedPassword = hashPassword("password123");

	const userResult = await client.query<{ id: string }>(
		`INSERT INTO "User" (id, cuid, name, email, "emailVerified", role, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (email) DO UPDATE SET role = $6, name = $3
		 RETURNING id`,
		[
			adminUserId,
			cuid(),
			"Admin User",
			"admin@example.com",
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

		await client.query("COMMIT");

		console.log("\n✅ Seed complete!");
		console.log("\n  Admin credentials:");
		console.log("    Email:    admin@example.com");
		console.log("    Password: password123");
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
