#!/usr/bin/env tsx

/**
 * Database Seed Script
 *
 * Seeds the database with demo data for development and E2E testing.
 *
 * Usage:
 *   bun run db:seed          # seed with default data
 *   DATABASE_URL=... bun run db:seed
 *
 * Requirements:
 *   - DATABASE_URL must be set (or .env file present)
 *   - Database must be migrated (`bun prisma migrate deploy` in packages/db)
 *
 * What it creates:
 *   - Admin user (admin@example.com / password123)
 *   - 8 demo products across 6 categories
 *   - 3 collections (Featured, New Arrivals, Best Sellers)
 *   - 2 demo customers
 *   - Store settings (name, currency, etc.)
 *   - Inventory records for all products
 */

import { createHash, scryptSync, randomBytes } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Database connection (raw SQL via pg, no Prisma generation needed)   */
/* ------------------------------------------------------------------ */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("DATABASE_URL environment variable is required");
	process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORE_ID = process.env.STORE_ID || "de005b9d-c517-4c65-896e-8edef5cf5a94";
const now = new Date().toISOString();

/**
 * Generate a deterministic UUID from a stable key.
 * This ensures re-running the seed produces the same IDs,
 * allowing ON CONFLICT upserts to work correctly.
 */
const SEED_NAMESPACE = "86d-seed-v1";
function uuid(key: string): string {
	const hash = createHash("sha256")
		.update(`${SEED_NAMESPACE}:${key}`)
		.digest("hex");
	// Format as UUID v4-compatible (set version nibble to 4, variant bits to 10xx)
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		`4${hash.slice(13, 16)}`,
		`${(0x8 | (Number.parseInt(hash[16], 16) & 0x3)).toString(16)}${hash.slice(17, 20)}`,
		hash.slice(20, 32),
	].join("-");
}

/** Hash password using Better Auth's scrypt format: hex-salt:hex-key */
function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const key = scryptSync(password.normalize("NFKC"), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 64 * 1024 * 1024, // 64MB — required for bun/Docker environments
	});
	return `${salt}:${key.toString("hex")}`;
}

/** Generate a cuid-like string for the cuid column */
function cuid(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	let result = "c";
	for (let i = 0; i < 24; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}

function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/* IDs — pre-generated so we can cross-reference                      */
/* ------------------------------------------------------------------ */

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

for (const name of moduleNames) {
	moduleIds[name] = uuid(`module:${STORE_ID}:${name}`);
}

/* ------------------------------------------------------------------ */
/* Demo data definitions                                              */
/* ------------------------------------------------------------------ */

interface Product {
	id: string;
	name: string;
	slug: string;
	description: string;
	price: number;
	compareAtPrice?: number;
	sku: string;
	status: string;
	categoryId: string;
	inventory: number;
	trackInventory: boolean;
	allowBackorder: boolean;
	isFeatured: boolean;
	images: Array<{ url: string; alt: string }>;
	tags: string[];
	weight: number;
	weightUnit: string;
}

const categoryIds = {
	clothing: uuid("category:clothing"),
	accessories: uuid("category:accessories"),
	electronics: uuid("category:electronics"),
	foodDrink: uuid("category:food-drink"),
	homeKitchen: uuid("category:home-kitchen"),
	sportsOutdoors: uuid("category:sports-outdoors"),
};

const categories = [
	{
		id: categoryIds.clothing,
		name: "Clothing",
		slug: "clothing",
		description: "Apparel and fashion items",
		isVisible: true,
		position: 0,
	},
	{
		id: categoryIds.accessories,
		name: "Accessories",
		slug: "accessories",
		description: "Bags, scarves, and personal items",
		isVisible: true,
		position: 1,
	},
	{
		id: categoryIds.electronics,
		name: "Electronics",
		slug: "electronics",
		description: "Gadgets and electronic devices",
		isVisible: true,
		position: 2,
	},
	{
		id: categoryIds.foodDrink,
		name: "Food & Drink",
		slug: "food-drink",
		description: "Gourmet food and beverages",
		isVisible: true,
		position: 3,
	},
	{
		id: categoryIds.homeKitchen,
		name: "Home & Kitchen",
		slug: "home-kitchen",
		description: "Home goods and kitchenware",
		isVisible: true,
		position: 4,
	},
	{
		id: categoryIds.sportsOutdoors,
		name: "Sports & Outdoors",
		slug: "sports-outdoors",
		description: "Athletic and outdoor gear",
		isVisible: true,
		position: 5,
	},
];

const products: Product[] = [
	{
		id: uuid("product:classic-white-t-shirt"),
		name: "Classic White T-Shirt",
		slug: "classic-white-t-shirt",
		description:
			"A timeless staple crafted from 100% organic cotton. Soft, breathable, and perfect for everyday wear.",
		price: 2999,
		compareAtPrice: 3999,
		sku: "TSH-WHT-001",
		status: "active",
		categoryId: categoryIds.clothing,
		inventory: 150,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: true,
		images: [
			{
				url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
				alt: "Classic White T-Shirt",
			},
		],
		tags: ["clothing", "t-shirt", "cotton", "basics"],
		weight: 0.2,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:leather-messenger-bag"),
		name: "Leather Messenger Bag",
		slug: "leather-messenger-bag",
		description:
			"Handcrafted from full-grain leather with brass hardware. Fits a 15-inch laptop with room for essentials.",
		price: 8999,
		compareAtPrice: 11999,
		sku: "BAG-LTR-001",
		status: "active",
		categoryId: categoryIds.accessories,
		inventory: 45,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: true,
		images: [
			{
				url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",
				alt: "Leather Messenger Bag",
			},
		],
		tags: ["bags", "leather", "messenger", "laptop"],
		weight: 1.2,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:wireless-bluetooth-headphones"),
		name: "Wireless Bluetooth Headphones",
		slug: "wireless-bluetooth-headphones",
		description:
			"Premium over-ear headphones with active noise cancellation, 30-hour battery life, and Hi-Res audio.",
		price: 14999,
		sku: "ELC-HPH-001",
		status: "active",
		categoryId: categoryIds.electronics,
		inventory: 80,
		trackInventory: true,
		allowBackorder: true,
		isFeatured: true,
		images: [
			{
				url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
				alt: "Wireless Bluetooth Headphones",
			},
		],
		tags: ["electronics", "headphones", "bluetooth", "wireless"],
		weight: 0.35,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:organic-coffee-beans"),
		name: "Organic Coffee Beans",
		slug: "organic-coffee-beans",
		description:
			"Single-origin Ethiopian Yirgacheffe. Medium roast with notes of blueberry, chocolate, and citrus.",
		price: 1899,
		sku: "FOD-COF-001",
		status: "active",
		categoryId: categoryIds.foodDrink,
		inventory: 200,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: false,
		images: [
			{
				url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800",
				alt: "Organic Coffee Beans",
			},
		],
		tags: ["coffee", "organic", "ethiopian", "beans"],
		weight: 0.45,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:handcrafted-ceramic-mug"),
		name: "Handcrafted Ceramic Mug",
		slug: "handcrafted-ceramic-mug",
		description:
			"Artisan-made stoneware mug with a reactive glaze finish. Microwave and dishwasher safe. 12oz capacity.",
		price: 2499,
		sku: "HOM-MUG-001",
		status: "active",
		categoryId: categoryIds.homeKitchen,
		inventory: 120,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: true,
		images: [
			{
				url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800",
				alt: "Handcrafted Ceramic Mug",
			},
		],
		tags: ["mug", "ceramic", "handmade", "kitchen"],
		weight: 0.4,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:running-shoes-pro"),
		name: "Running Shoes Pro",
		slug: "running-shoes-pro",
		description:
			"Lightweight performance running shoes with responsive cushioning and breathable mesh upper.",
		price: 11999,
		compareAtPrice: 14999,
		sku: "SPT-SHO-001",
		status: "active",
		categoryId: categoryIds.sportsOutdoors,
		inventory: 60,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: true,
		images: [
			{
				url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
				alt: "Running Shoes Pro",
			},
		],
		tags: ["shoes", "running", "athletic", "sports"],
		weight: 0.3,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:bamboo-water-bottle"),
		name: "Bamboo Water Bottle",
		slug: "bamboo-water-bottle",
		description:
			"Sustainable double-walled stainless steel bottle with bamboo cap. Keeps drinks cold 24hrs or hot 12hrs.",
		price: 3499,
		sku: "SPT-BTL-001",
		status: "active",
		categoryId: categoryIds.sportsOutdoors,
		inventory: 90,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: false,
		images: [
			{
				url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
				alt: "Bamboo Water Bottle",
			},
		],
		tags: ["bottle", "bamboo", "sustainable", "sports"],
		weight: 0.35,
		weightUnit: "kg",
	},
	{
		id: uuid("entity:wool-blend-scarf"),
		name: "Wool Blend Scarf",
		slug: "wool-blend-scarf",
		description:
			"Luxurious merino wool and cashmere blend scarf. Ultra-soft with a classic herringbone pattern.",
		price: 4499,
		sku: "ACC-SCF-001",
		status: "active",
		categoryId: categoryIds.accessories,
		inventory: 75,
		trackInventory: true,
		allowBackorder: false,
		isFeatured: false,
		images: [
			{
				url: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800",
				alt: "Wool Blend Scarf",
			},
		],
		tags: ["scarf", "wool", "cashmere", "winter"],
		weight: 0.15,
		weightUnit: "kg",
	},
];

const collectionIds = {
	featured: uuid("collection-ids:featured"),
	newArrivals: uuid("collection-ids:newArrivals"),
	bestSellers: uuid("collection-ids:bestSellers"),
};

const collections = [
	{
		id: collectionIds.featured,
		name: "Featured Products",
		slug: "featured",
		description: "Our hand-picked selection of the best products.",
		isFeatured: true,
		isVisible: true,
		position: 0,
	},
	{
		id: collectionIds.newArrivals,
		name: "New Arrivals",
		slug: "new-arrivals",
		description: "The latest additions to our store.",
		isFeatured: false,
		isVisible: true,
		position: 1,
	},
	{
		id: collectionIds.bestSellers,
		name: "Best Sellers",
		slug: "best-sellers",
		description: "Our most popular products.",
		isFeatured: false,
		isVisible: true,
		position: 2,
	},
];

const customerIds = { john: uuid("seed-line-504"), jane: uuid("seed-1") };

const customers = [
	{
		id: customerIds.john,
		email: "john@example.com",
		firstName: "John",
		lastName: "Doe",
		phone: "+1-555-0101",
	},
	{
		id: customerIds.jane,
		email: "jane@example.com",
		firstName: "Jane",
		lastName: "Smith",
		phone: "+1-555-0102",
	},
];

const settings = [
	// General
	{ key: "general.store_name", value: "86d Demo Store", group: "general" },
	{
		key: "general.store_description",
		value: "A demo store powered by 86d",
		group: "general",
	},
	{
		key: "general.timezone",
		value: "America/Los_Angeles",
		group: "general",
	},
	// Contact
	{
		key: "contact.support_email",
		value: "hello@demo.86d.app",
		group: "contact",
	},
	{
		key: "contact.support_phone",
		value: "+1-555-0100",
		group: "contact",
	},
	{
		key: "contact.business_address",
		value: "123 Commerce St",
		group: "contact",
	},
	{ key: "contact.business_city", value: "San Francisco", group: "contact" },
	{ key: "contact.business_state", value: "CA", group: "contact" },
	{
		key: "contact.business_postal_code",
		value: "94102",
		group: "contact",
	},
	{ key: "contact.business_country", value: "US", group: "contact" },
	// Commerce
	{ key: "commerce.currency", value: "USD", group: "commerce" },
	{ key: "commerce.weight_unit", value: "kg", group: "commerce" },
	{ key: "commerce.tax_included", value: "false", group: "commerce" },
];

/* ------------------------------------------------------------------ */
/* Seed functions                                                     */
/* ------------------------------------------------------------------ */

async function seedAdminUser(client: pg.PoolClient) {
	console.log("  Creating admin user...");
	const hashedPassword = hashPassword("password123");

	await client.query(
		`INSERT INTO "User" (id, cuid, name, email, "emailVerified", role, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (email) DO UPDATE SET role = $6, name = $3`,
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

	await client.query(
		`INSERT INTO "Account" (id, cuid, "accountId", "providerId", password, "userId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT DO NOTHING`,
		[
			adminAccountId,
			cuid(),
			adminUserId,
			"credential",
			hashedPassword,
			adminUserId,
			now,
			now,
		],
	);
}

/**
 * When the private/ repo's schema has been pushed to the same database,
 * Module.storeId has a foreign key to Store.id. Ensure a Store (and its
 * parent Business) record exists so the FK is satisfied.
 */
async function ensureStoreRecord(client: pg.PoolClient) {
	const { rows } = await client.query(
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'Store'
		) AS "exists"`,
	);
	if (!rows[0]?.exists) return;

	const storeExists = await client.query(
		`SELECT 1 FROM "Store" WHERE id = $1`,
		[STORE_ID],
	);
	if (storeExists.rows.length > 0) return;

	// Need a Business to satisfy Store.businessId FK
	const BUSINESS_ID = uuid("seed-business");
	await client.query(
		`INSERT INTO "Business" (id, cuid, name, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (id) DO NOTHING`,
		[BUSINESS_ID, cuid(), "86d Demo Business", now, now],
	);

	await client.query(
		`INSERT INTO "Store" (id, cuid, name, "businessId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (id) DO NOTHING`,
		[STORE_ID, cuid(), "86d Demo Store", BUSINESS_ID, now, now],
	);
}

async function seedModules(client: pg.PoolClient) {
	console.log("  Creating module records...");
	await ensureStoreRecord(client);
	for (const name of moduleNames) {
		const { rows } = await client.query<{ id: string }>(
			`INSERT INTO "Module" (id, cuid, name, version, "isEnabled", "storeId", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT ("storeId", name) DO UPDATE SET "isEnabled" = true, "updatedAt" = $8
			 RETURNING id`,
			[moduleIds[name], cuid(), name, "0.0.4", true, STORE_ID, now, now],
		);
		const row = rows[0];
		if (row) {
			moduleIds[name] = row.id;
		}
	}
}

async function insertModuleData(
	client: pg.PoolClient,
	moduleName: string,
	entityType: string,
	entityId: string,
	data: Record<string, unknown>,
) {
	const modId = moduleIds[moduleName];
	if (!modId) return;
	// Derive a stable, unique row id from the entity's identity so that:
	// 1. Each (module, entityType, entityId) gets a deterministic primary key.
	// 2. Re-running the seed conflicts on BOTH the primary key AND the
	//    composite unique constraint — the ON CONFLICT handler matches.
	const rowId = uuid(`module-data:${STORE_ID}:${moduleName}:${entityType}:${entityId}`);
	await client.query(
		`INSERT INTO "ModuleData" (id, cuid, "entityType", "entityId", data, "moduleId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT ("moduleId", "entityType", "entityId") DO UPDATE SET data = $5, "updatedAt" = $8`,
		[rowId, cuid(), entityType, entityId, JSON.stringify(data), modId, now, now],
	);
}

async function seedProducts(client: pg.PoolClient) {
	console.log("  Creating categories...");
	for (const cat of categories) {
		await insertModuleData(client, "products", "category", cat.id, {
			...cat,
			createdAt: now,
			updatedAt: now,
		});
	}

	console.log("  Creating products...");
	for (const product of products) {
		await insertModuleData(client, "products", "product", product.id, {
			...product,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedCollections(client: pg.PoolClient) {
	console.log("  Creating collections...");
	for (const col of collections) {
		await insertModuleData(client, "products", "collection", col.id, {
			...col,
			type: "manual",
			sortOrder: "manual",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Link featured products to the Featured collection
	const featuredProducts = products.filter((p) => p.isFeatured);
	for (let i = 0; i < featuredProducts.length; i++) {
		const linkId = uuid(`collection-product:${collectionIds.featured}:${featuredProducts[i].id}`);
		await insertModuleData(
			client,
			"products",
			"collectionProduct",
			linkId,
			{
				id: linkId,
				collectionId: collectionIds.featured,
				productId: featuredProducts[i].id,
				position: i,
				addedAt: now,
			},
		);
	}

	// Link all products to New Arrivals
	for (let i = 0; i < products.length; i++) {
		const linkId = uuid(`collection-product:${collectionIds.newArrivals}:${products[i].id}`);
		await insertModuleData(
			client,
			"products",
			"collectionProduct",
			linkId,
			{
				id: linkId,
				collectionId: collectionIds.newArrivals,
				productId: products[i].id,
				position: i,
				addedAt: now,
			},
		);
	}

	// Top 4 as best sellers
	for (let i = 0; i < 4; i++) {
		const linkId = uuid(`collection-product:${collectionIds.bestSellers}:${products[i].id}`);
		await insertModuleData(
			client,
			"products",
			"collectionProduct",
			linkId,
			{
				id: linkId,
				collectionId: collectionIds.bestSellers,
				productId: products[i].id,
				position: i,
				addedAt: now,
			},
		);
	}
}

async function seedCustomers(client: pg.PoolClient) {
	console.log("  Creating customers...");
	for (const customer of customers) {
		await insertModuleData(client, "customers", "customer", customer.id, {
			...customer,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Add an address for John
	const addressId = uuid("seed-5");
	await insertModuleData(client, "customers", "customerAddress", addressId, {
		id: addressId,
		customerId: customerIds.john,
		type: "shipping",
		firstName: "John",
		lastName: "Doe",
		line1: "456 Oak Avenue",
		city: "San Francisco",
		state: "CA",
		postalCode: "94102",
		country: "US",
		isDefault: true,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedSettings(client: pg.PoolClient) {
	console.log("  Creating store settings...");
	for (const setting of settings) {
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
		const itemId = uuid(`inventory:${product.id}`);
		await insertModuleData(client, "inventory", "inventoryItem", itemId, {
			id: itemId,
			productId: product.id,
			quantity: product.inventory,
			reserved: 0,
			allowBackorder: product.allowBackorder,
			lowStockThreshold: 10,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedNavigation(client: pg.PoolClient) {
	console.log("  Creating navigation menus...");
	const mainMenuId = uuid("seed-8");
	await insertModuleData(client, "navigation", "menu", mainMenuId, {
		id: mainMenuId,
		name: "Main Navigation",
		slug: "main",
		location: "header",
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	const menuItems = [
		{ label: "Home", url: "/", position: 0 },
		{ label: "Products", url: "/products", position: 1 },
		{ label: "Collections", url: "/collections", position: 2 },
		{ label: "About", url: "/about", position: 3 },
		{ label: "Contact", url: "/contact", position: 4 },
	];

	for (const item of menuItems) {
		const itemId = uuid(`menu-item:${mainMenuId}:${item.url}`);
		await insertModuleData(client, "navigation", "menuItem", itemId, {
			id: itemId,
			menuId: mainMenuId,
			label: item.label,
			url: item.url,
			position: item.position,
			isVisible: true,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedDemoOrder(client: pg.PoolClient) {
	console.log("  Creating demo order...");
	const orderId = uuid("seed-10");
	const orderNumber = "ORD-1001";

	await insertModuleData(client, "orders", "order", orderId, {
		id: orderId,
		orderNumber,
		customerId: customerIds.john,
		subtotal: 119.98,
		taxAmount: 9.6,
		shippingAmount: 5.99,
		discountAmount: 0,
		total: 135.57,
		currency: "USD",
		status: "completed",
		paymentStatus: "paid",
		createdAt: now,
		updatedAt: now,
	});

	// Order items
	const item1Id = uuid("seed-11");
	await insertModuleData(client, "orders", "orderItem", item1Id, {
		id: item1Id,
		orderId,
		productId: products[0].id,
		name: products[0].name,
		price: products[0].price,
		quantity: 2,
		subtotal: products[0].price * 2,
		sku: products[0].sku,
	});

	const item2Id = uuid("seed-12");
	await insertModuleData(client, "orders", "orderItem", item2Id, {
		id: item2Id,
		orderId,
		productId: products[4].id,
		name: products[4].name,
		price: products[4].price,
		quantity: 1,
		subtotal: products[4].price,
		sku: products[4].sku,
	});

	// Shipping address
	const addressId = uuid("seed-13");
	await insertModuleData(client, "orders", "orderAddress", addressId, {
		id: addressId,
		orderId,
		type: "shipping",
		firstName: "John",
		lastName: "Doe",
		line1: "456 Oak Avenue",
		city: "San Francisco",
		state: "CA",
		postalCode: "94102",
		country: "US",
	});
}

/* ------------------------------------------------------------------ */
/* Additional module seed functions                                   */
/* ------------------------------------------------------------------ */

async function seedBrands(client: pg.PoolClient) {
	console.log("  Creating brands...");
	const brands = [
		{
			id: uuid("entity:artisan-co."),
			name: "Artisan Co.",
			slug: "artisan-co",
			description: "Handcrafted goods made with care and tradition.",
			logo: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200",
			website: "https://artisan.example.com",
			isActive: true,
			isFeatured: true,
			position: 0,
		},
		{
			id: uuid("entity:techedge"),
			name: "TechEdge",
			slug: "techedge",
			description: "Cutting-edge consumer electronics and accessories.",
			logo: "https://images.unsplash.com/photo-1496200186974-4293800e2f20?w=200",
			website: "https://techedge.example.com",
			isActive: true,
			isFeatured: true,
			position: 1,
		},
		{
			id: uuid("entity:verde-naturals"),
			name: "Verde Naturals",
			slug: "verde-naturals",
			description: "Sustainable, eco-friendly products for everyday life.",
			logo: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=200",
			isActive: true,
			isFeatured: false,
			position: 2,
		},
	];

	for (const brand of brands) {
		await insertModuleData(client, "brands", "brand", brand.id, {
			...brand,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Link some products to brands
	for (let i = 0; i < Math.min(products.length, brands.length); i++) {
		const linkId = uuid(`brand-product:${brands[i].id}:${products[i].id}`);
		await insertModuleData(client, "brands", "brandProduct", linkId, {
			id: linkId,
			brandId: brands[i].id,
			productId: products[i].id,
		});
	}
}

async function seedReviews(client: pg.PoolClient) {
	console.log("  Creating reviews...");
	const reviewData = [
		{
			productId: products[0].id,
			authorName: "Sarah M.",
			authorEmail: "sarah@example.com",
			rating: 5,
			title: "Perfect everyday tee",
			body: "Incredibly soft fabric and the fit is just right. Already ordered two more!",
			status: "approved",
			isVerifiedPurchase: true,
		},
		{
			productId: products[0].id,
			authorName: "Mike T.",
			authorEmail: "mike@example.com",
			rating: 4,
			title: "Great quality",
			body: "Nice weight and feel. Runs slightly large but still a great shirt.",
			status: "approved",
			isVerifiedPurchase: true,
		},
		{
			productId: products[1].id,
			authorName: "Emily R.",
			authorEmail: "emily@example.com",
			rating: 5,
			title: "Beautiful craftsmanship",
			body: "The leather is gorgeous and the bag is very well made. Gets better with age.",
			status: "approved",
			isVerifiedPurchase: true,
		},
		{
			productId: products[2].id,
			authorName: "David L.",
			authorEmail: "david@example.com",
			rating: 5,
			title: "Best headphones I've owned",
			body: "The noise cancellation is incredible and battery life easily lasts a full day.",
			status: "approved",
			isVerifiedPurchase: false,
		},
		{
			productId: products[4].id,
			authorName: "Lisa K.",
			authorEmail: "lisa@example.com",
			rating: 4,
			title: "Lovely mug",
			body: "Beautiful glaze and perfect size. The handle could be a bit bigger though.",
			status: "approved",
			isVerifiedPurchase: true,
		},
	];

	for (const review of reviewData) {
		const reviewId = uuid(`review:${review.productId}:${review.authorEmail}`);
		await insertModuleData(client, "reviews", "review", reviewId, {
			id: reviewId,
			...review,
			helpfulCount: 0,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedBlog(client: pg.PoolClient) {
	console.log("  Creating blog posts...");
	const posts = [
		{
			id: uuid("seed-16"),
			title: "Welcome to Our Store",
			slug: "welcome-to-our-store",
			content:
				"We're excited to launch our new online store! Browse our curated collection of quality products, from handcrafted leather goods to premium electronics. Each item is selected for its exceptional quality and design.",
			excerpt: "Discover our curated collection of quality products.",
			author: "Admin",
			category: "news",
			status: "published",
			tags: ["announcement", "launch"],
			publishedAt: now,
		},
		{
			id: uuid("seed-17"),
			title: "The Art of Leather Craftsmanship",
			slug: "art-of-leather-craftsmanship",
			content:
				"Full-grain leather is the highest quality leather available. It retains the complete grain surface, developing a rich patina over time. Our messenger bags are crafted by skilled artisans who have perfected their technique over decades.",
			excerpt:
				"Learn about the craftsmanship behind our leather goods.",
			author: "Admin",
			category: "craftsmanship",
			status: "published",
			tags: ["leather", "craftsmanship", "quality"],
			publishedAt: now,
		},
		{
			id: uuid("seed-18"),
			title: "Sustainable Living Guide",
			slug: "sustainable-living-guide",
			content:
				"Small changes make a big difference. Our bamboo water bottles and organic products help reduce your environmental footprint without sacrificing quality or style. Here are five easy swaps you can make today.",
			excerpt: "Simple tips for a more sustainable lifestyle.",
			author: "Admin",
			category: "sustainability",
			status: "published",
			tags: ["sustainability", "eco-friendly", "tips"],
			publishedAt: now,
		},
	];

	for (const post of posts) {
		await insertModuleData(client, "blog", "post", post.id, {
			...post,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedPages(client: pg.PoolClient) {
	console.log("  Creating pages...");
	const pageData = [
		{
			id: uuid("seed-19"),
			title: "About Us",
			slug: "about",
			content:
				"We are a modern commerce platform dedicated to connecting customers with quality products. Our mission is to make online shopping simple, enjoyable, and trustworthy.",
			status: "published",
			showInNavigation: true,
			position: 0,
		},
		{
			id: uuid("seed-20"),
			title: "Contact",
			slug: "contact",
			content:
				"Get in touch with our team. Email us at hello@demo.86d.app or call +1-555-0100. Our support hours are Monday through Friday, 9am to 5pm PST.",
			status: "published",
			showInNavigation: true,
			position: 1,
		},
		{
			id: uuid("seed-21"),
			title: "Shipping Policy",
			slug: "shipping-policy",
			content:
				"We offer free standard shipping on orders over $50. Standard shipping takes 5-7 business days. Express shipping (2-3 business days) is available for $9.99. International shipping rates vary by destination.",
			status: "published",
			showInNavigation: false,
			position: 2,
		},
		{
			id: uuid("seed-22"),
			title: "Return Policy",
			slug: "return-policy",
			content:
				"We accept returns within 30 days of purchase. Items must be in original condition with tags attached. Refunds are processed within 5-7 business days after we receive the returned item.",
			status: "published",
			showInNavigation: false,
			position: 3,
		},
		{
			id: uuid("seed-23"),
			title: "Privacy Policy",
			slug: "privacy-policy",
			content:
				"Your privacy is important to us. We collect only the information necessary to process your orders and improve your shopping experience. We never sell your personal data to third parties.",
			status: "published",
			showInNavigation: false,
			position: 4,
		},
	];

	for (const page of pageData) {
		await insertModuleData(client, "pages", "page", page.id, {
			...page,
			publishedAt: now,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedShipping(client: pg.PoolClient) {
	console.log("  Creating shipping zones and rates...");
	const domesticZoneId = uuid("seed-24");
	const internationalZoneId = uuid("seed-25");

	await insertModuleData(client, "shipping", "shippingZone", domesticZoneId, {
		id: domesticZoneId,
		name: "United States",
		countries: ["US"],
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(
		client,
		"shipping",
		"shippingZone",
		internationalZoneId,
		{
			id: internationalZoneId,
			name: "International",
			countries: [],
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	);

	const rates = [
		{
			id: uuid("seed-26"),
			zoneId: domesticZoneId,
			name: "Standard Shipping",
			price: 599,
			minOrderAmount: 0,
			isActive: true,
		},
		{
			id: uuid("seed-27"),
			zoneId: domesticZoneId,
			name: "Free Shipping",
			price: 0,
			minOrderAmount: 5000,
			isActive: true,
		},
		{
			id: uuid("seed-28"),
			zoneId: domesticZoneId,
			name: "Express Shipping",
			price: 999,
			minOrderAmount: 0,
			isActive: true,
		},
		{
			id: uuid("seed-29"),
			zoneId: internationalZoneId,
			name: "International Standard",
			price: 1499,
			minOrderAmount: 0,
			isActive: true,
		},
	];

	for (const rate of rates) {
		await insertModuleData(client, "shipping", "shippingRate", rate.id, {
			...rate,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedTax(client: pg.PoolClient) {
	console.log("  Creating tax rates...");
	const taxRates = [
		{
			id: uuid("entity:california-sales-tax"),
			name: "California Sales Tax",
			country: "US",
			state: "CA",
			rate: 7.25,
			type: "percentage",
			enabled: true,
			priority: 0,
			compound: false,
			inclusive: false,
		},
		{
			id: uuid("entity:new-york-sales-tax"),
			name: "New York Sales Tax",
			country: "US",
			state: "NY",
			rate: 8.0,
			type: "percentage",
			enabled: true,
			priority: 0,
			compound: false,
			inclusive: false,
		},
		{
			id: uuid("entity:texas-sales-tax"),
			name: "Texas Sales Tax",
			country: "US",
			state: "TX",
			rate: 6.25,
			type: "percentage",
			enabled: true,
			priority: 0,
			compound: false,
			inclusive: false,
		},
	];

	for (const rate of taxRates) {
		await insertModuleData(client, "tax", "taxRate", rate.id, {
			...rate,
			createdAt: now,
			updatedAt: now,
		});
	}

	const categoryId = uuid("seed-30");
	await insertModuleData(client, "tax", "taxCategory", categoryId, {
		id: categoryId,
		name: "Standard Rate",
		description: "Default tax category for most products",
		createdAt: now,
		updatedAt: now,
	});
}

async function seedDiscounts(client: pg.PoolClient) {
	console.log("  Creating discounts...");
	const discountId = uuid("seed-31");
	await insertModuleData(client, "discounts", "discount", discountId, {
		id: discountId,
		name: "Welcome 10% Off",
		description: "10% off your first order",
		type: "percentage",
		value: 10,
		appliesTo: "all",
		stackable: false,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	const codeId = uuid("seed-32");
	await insertModuleData(client, "discounts", "discountCode", codeId, {
		id: codeId,
		discountId,
		code: "WELCOME10",
		usedCount: 0,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	const freeShipId = uuid("seed-33");
	await insertModuleData(client, "discounts", "discount", freeShipId, {
		id: freeShipId,
		name: "Free Shipping Over $75",
		description: "Free shipping on orders $75+",
		type: "free_shipping",
		value: 0,
		minimumAmount: 7500,
		appliesTo: "all",
		stackable: true,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	const freeShipCodeId = uuid("seed-34");
	await insertModuleData(
		client,
		"discounts",
		"discountCode",
		freeShipCodeId,
		{
			id: freeShipCodeId,
			discountId: freeShipId,
			code: "FREESHIP75",
			usedCount: 0,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	);
}

async function seedFaq(client: pg.PoolClient) {
	console.log("  Creating FAQ...");
	const shippingCatId = uuid("seed-35");
	const returnsCatId = uuid("seed-36");
	const generalCatId = uuid("seed-37");

	await insertModuleData(client, "faq", "faqCategory", shippingCatId, {
		id: shippingCatId,
		name: "Shipping & Delivery",
		slug: "shipping-delivery",
		description: "Questions about shipping and delivery times",
		position: 0,
		isVisible: true,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "faq", "faqCategory", returnsCatId, {
		id: returnsCatId,
		name: "Returns & Refunds",
		slug: "returns-refunds",
		description: "Questions about our return and refund policy",
		position: 1,
		isVisible: true,
		createdAt: now,
		updatedAt: now,
	});

	await insertModuleData(client, "faq", "faqCategory", generalCatId, {
		id: generalCatId,
		name: "General",
		slug: "general",
		description: "General questions about our store",
		position: 2,
		isVisible: true,
		createdAt: now,
		updatedAt: now,
	});

	const faqItems = [
		{
			categoryId: shippingCatId,
			question: "How long does shipping take?",
			answer:
				"Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.",
			slug: "how-long-does-shipping-take",
			position: 0,
		},
		{
			categoryId: shippingCatId,
			question: "Do you offer free shipping?",
			answer:
				"Yes! We offer free standard shipping on all orders over $50.",
			slug: "do-you-offer-free-shipping",
			position: 1,
		},
		{
			categoryId: shippingCatId,
			question: "Do you ship internationally?",
			answer:
				"Yes, we ship to most countries worldwide. International shipping rates vary by destination.",
			slug: "do-you-ship-internationally",
			position: 2,
		},
		{
			categoryId: returnsCatId,
			question: "What is your return policy?",
			answer:
				"We accept returns within 30 days of purchase. Items must be in original condition with tags attached.",
			slug: "what-is-your-return-policy",
			position: 0,
		},
		{
			categoryId: returnsCatId,
			question: "How long do refunds take?",
			answer:
				"Refunds are processed within 5-7 business days after we receive the returned item.",
			slug: "how-long-do-refunds-take",
			position: 1,
		},
		{
			categoryId: generalCatId,
			question: "How do I create an account?",
			answer:
				'Click the "Sign Up" button in the top right corner and follow the registration steps.',
			slug: "how-do-i-create-an-account",
			position: 0,
		},
		{
			categoryId: generalCatId,
			question: "How can I contact customer support?",
			answer:
				"You can reach us at hello@demo.86d.app or call +1-555-0100 during business hours (Mon-Fri, 9am-5pm PST).",
			slug: "how-can-i-contact-support",
			position: 1,
		},
	];

	for (const item of faqItems) {
		const itemId = uuid(`faq-item:${item.slug}`);
		await insertModuleData(client, "faq", "faqItem", itemId, {
			id: itemId,
			...item,
			isVisible: true,
			helpfulCount: 0,
			notHelpfulCount: 0,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedAnnouncements(client: pg.PoolClient) {
	console.log("  Creating announcements...");
	const announcementId = uuid("seed-39");
	await insertModuleData(
		client,
		"announcements",
		"announcement",
		announcementId,
		{
			id: announcementId,
			title: "Free Shipping on Orders Over $50",
			content: "Use code FREESHIP at checkout. Limited time offer!",
			type: "bar",
			position: "top",
			backgroundColor: "#1a1a2e",
			textColor: "#ffffff",
			linkUrl: "/products",
			linkText: "Shop Now",
			priority: 0,
			isActive: true,
			isDismissible: true,
			targetAudience: "all",
			impressions: 0,
			clicks: 0,
			dismissals: 0,
			createdAt: now,
			updatedAt: now,
		},
	);
}

async function seedSeo(client: pg.PoolClient) {
	console.log("  Creating SEO meta tags...");
	const metaTags = [
		{
			path: "/",
			title: "86d Demo Store - Quality Products, Honest Prices",
			description:
				"Discover curated products from handcrafted leather goods to premium electronics. Free shipping on orders over $50.",
			ogTitle: "86d Demo Store",
			ogDescription:
				"Quality products, honest prices. Shop our curated collection.",
			ogType: "website",
		},
		{
			path: "/products",
			title: "All Products - 86d Demo Store",
			description:
				"Browse our full catalog of quality products across clothing, electronics, accessories, and more.",
		},
		{
			path: "/collections",
			title: "Collections - 86d Demo Store",
			description:
				"Explore our curated product collections including Featured Products, New Arrivals, and Best Sellers.",
		},
		{
			path: "/blog",
			title: "Blog - 86d Demo Store",
			description:
				"Read our latest articles on craftsmanship, sustainability, and product guides.",
		},
	];

	for (const meta of metaTags) {
		const metaId = uuid(`seo-meta:${meta.path}`);
		await insertModuleData(client, "seo", "metaTag", metaId, {
			id: metaId,
			...meta,
			noIndex: false,
			noFollow: false,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedSearch(client: pg.PoolClient) {
	console.log("  Creating search index...");
	for (const product of products) {
		const indexId = uuid(`search-index:${product.id}`);
		await insertModuleData(client, "search", "searchIndex", indexId, {
			id: indexId,
			entityType: "product",
			entityId: product.id,
			title: product.name,
			body: product.description,
			tags: product.tags,
			url: `/products/${product.slug}`,
			image: product.images[0]?.url,
			metadata: {
				price: product.price,
				sku: product.sku,
				status: product.status,
			},
			createdAt: now,
			updatedAt: now,
		});
	}

	// Synonyms for common searches
	const synonyms = [
		{ term: "tee", synonyms: ["t-shirt", "tshirt", "shirt"] },
		{ term: "bag", synonyms: ["messenger", "backpack", "tote"] },
		{ term: "headphones", synonyms: ["earphones", "earbuds", "headset"] },
		{ term: "cup", synonyms: ["mug", "tumbler", "glass"] },
	];

	for (const syn of synonyms) {
		const synId = uuid(`search-synonym:${syn.term}`);
		await insertModuleData(client, "search", "searchSynonym", synId, {
			id: synId,
			term: syn.term,
			synonyms: syn.synonyms,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedNewsletter(client: pg.PoolClient) {
	console.log("  Creating newsletter subscribers...");
	const subscribers = [
		{
			email: "john@example.com",
			firstName: "John",
			lastName: "Doe",
			status: "active",
			source: "checkout",
		},
		{
			email: "jane@example.com",
			firstName: "Jane",
			lastName: "Smith",
			status: "active",
			source: "footer",
		},
		{
			email: "demo@example.com",
			firstName: "Demo",
			lastName: "User",
			status: "active",
			source: "popup",
		},
	];

	for (const sub of subscribers) {
		const subId = uuid(`newsletter-subscriber:${sub.email}`);
		await insertModuleData(client, "newsletter", "subscriber", subId, {
			id: subId,
			...sub,
			tags: [],
			subscribedAt: now,
			createdAt: now,
			updatedAt: now,
		});
	}
}

async function seedSocialProof(client: pg.PoolClient) {
	console.log("  Creating social proof...");
	// Trust badges
	const badges = [
		{
			name: "Secure Checkout",
			description: "256-bit SSL encryption",
			icon: "shield-check",
			position: 0,
			priority: 0,
			isActive: true,
		},
		{
			name: "Free Returns",
			description: "30-day return policy",
			icon: "refresh-cw",
			position: 1,
			priority: 0,
			isActive: true,
		},
		{
			name: "Fast Shipping",
			description: "Free shipping on $50+",
			icon: "truck",
			position: 2,
			priority: 0,
			isActive: true,
		},
	];

	for (const badge of badges) {
		const badgeId = uuid(`trust-badge:${badge.name}`);
		await insertModuleData(client, "social-proof", "trustBadge", badgeId, {
			id: badgeId,
			...badge,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Recent activity events
	const events = [
		{
			productId: products[0].id,
			productName: products[0].name,
			productSlug: products[0].slug,
			productImage: products[0].images[0]?.url,
			eventType: "purchase",
			region: "US",
			country: "United States",
			city: "San Francisco",
			quantity: 1,
		},
		{
			productId: products[2].id,
			productName: products[2].name,
			productSlug: products[2].slug,
			productImage: products[2].images[0]?.url,
			eventType: "purchase",
			region: "US",
			country: "United States",
			city: "New York",
			quantity: 1,
		},
	];

	for (const event of events) {
		const eventId = uuid(`activity-event:${event.productId}:${event.eventType}`);
		await insertModuleData(
			client,
			"social-proof",
			"activityEvent",
			eventId,
			{
				id: eventId,
				...event,
				createdAt: now,
				updatedAt: now,
			},
		);
	}
}

async function seedProductLabels(client: pg.PoolClient) {
	console.log("  Creating product labels...");
	const labels = [
		{
			id: uuid("entity:sale"),
			name: "Sale",
			slug: "sale",
			displayText: "Sale",
			type: "badge",
			color: "#ffffff",
			backgroundColor: "#ef4444",
			priority: 0,
			isActive: true,
		},
		{
			id: uuid("entity:new"),
			name: "New",
			slug: "new",
			displayText: "New",
			type: "badge",
			color: "#ffffff",
			backgroundColor: "#22c55e",
			priority: 1,
			isActive: true,
		},
		{
			id: uuid("entity:best-seller"),
			name: "Best Seller",
			slug: "best-seller",
			displayText: "Best Seller",
			type: "badge",
			color: "#ffffff",
			backgroundColor: "#3b82f6",
			priority: 2,
			isActive: true,
		},
	];

	for (const label of labels) {
		await insertModuleData(client, "product-labels", "label", label.id, {
			...label,
			createdAt: now,
			updatedAt: now,
		});
	}

	// Assign "Sale" label to products with compareAtPrice
	const saleProducts = products.filter((p) => p.compareAtPrice);
	for (const product of saleProducts) {
		const linkId = uuid(`product-label-sale:${product.id}`);
		await insertModuleData(
			client,
			"product-labels",
			"productLabel",
			linkId,
			{
				id: linkId,
				productId: product.id,
				labelId: labels[0].id,
				position: 0,
			},
		);
	}
}

async function seedRedirects(client: pg.PoolClient) {
	console.log("  Creating redirects...");
	const redirects = [
		{
			sourcePath: "/old-products",
			targetPath: "/products",
			statusCode: 301,
			isActive: true,
			isRegex: false,
			preserveQueryString: true,
			note: "Legacy products page redirect",
			hitCount: 0,
		},
		{
			sourcePath: "/shop",
			targetPath: "/products",
			statusCode: 301,
			isActive: true,
			isRegex: false,
			preserveQueryString: true,
			note: "Shop shortcut",
			hitCount: 0,
		},
		{
			sourcePath: "/faq",
			targetPath: "/help/faq",
			statusCode: 302,
			isActive: true,
			isRegex: false,
			preserveQueryString: false,
			note: "FAQ redirect to help center",
			hitCount: 0,
		},
	];

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
	const configId = uuid("seed-48");
	await insertModuleData(client, "sitemap", "sitemapConfig", configId, {
		id: configId,
		baseUrl: "https://demo.86d.app",
		includeProducts: true,
		includeCollections: true,
		includePages: true,
		includeBlog: true,
		includeBrands: true,
		defaultChangeFreq: "weekly",
		defaultPriority: 0.5,
		productChangeFreq: "weekly",
		productPriority: 0.8,
		collectionChangeFreq: "weekly",
		collectionPriority: 0.7,
		pageChangeFreq: "monthly",
		pagePriority: 0.6,
		excludedPaths: ["/admin", "/api", "/checkout"],
		lastGenerated: now,
		createdAt: now,
		updatedAt: now,
	});
}

async function seedStoreLocator(client: pg.PoolClient) {
	console.log("  Creating store locations...");
	const locations = [
		{
			id: uuid("entity:86d-flagship---san-francisco"),
			name: "86d Flagship - San Francisco",
			slug: "sf-flagship",
			description: "Our flagship store in the heart of San Francisco.",
			address: "123 Commerce St",
			city: "San Francisco",
			state: "CA",
			postalCode: "94102",
			country: "US",
			latitude: 37.7749,
			longitude: -122.4194,
			phone: "+1-555-0100",
			email: "sf@demo.86d.app",
			hours: {
				monday: { open: "09:00", close: "21:00" },
				tuesday: { open: "09:00", close: "21:00" },
				wednesday: { open: "09:00", close: "21:00" },
				thursday: { open: "09:00", close: "21:00" },
				friday: { open: "09:00", close: "22:00" },
				saturday: { open: "10:00", close: "22:00" },
				sunday: { open: "11:00", close: "19:00" },
			},
			amenities: ["wifi", "parking", "wheelchair-accessible"],
			isActive: true,
			isFeatured: true,
			pickupEnabled: true,
		},
		{
			id: uuid("entity:86d-downtown---new-york"),
			name: "86d Downtown - New York",
			slug: "nyc-downtown",
			description:
				"Our New York location in the heart of downtown Manhattan.",
			address: "456 Broadway",
			city: "New York",
			state: "NY",
			postalCode: "10013",
			country: "US",
			latitude: 40.7128,
			longitude: -74.006,
			phone: "+1-555-0200",
			email: "nyc@demo.86d.app",
			hours: {
				monday: { open: "10:00", close: "20:00" },
				tuesday: { open: "10:00", close: "20:00" },
				wednesday: { open: "10:00", close: "20:00" },
				thursday: { open: "10:00", close: "20:00" },
				friday: { open: "10:00", close: "21:00" },
				saturday: { open: "10:00", close: "21:00" },
				sunday: { open: "12:00", close: "18:00" },
			},
			amenities: ["wifi", "wheelchair-accessible"],
			isActive: true,
			isFeatured: false,
			pickupEnabled: true,
		},
	];

	for (const location of locations) {
		await insertModuleData(
			client,
			"store-locator",
			"location",
			location.id,
			{
				...location,
				createdAt: now,
				updatedAt: now,
			},
		);
	}
}

async function seedStorePickup(client: pg.PoolClient) {
	console.log("  Creating store pickup locations and windows...");
	const pickupLocationId = uuid("seed-49");
	await insertModuleData(
		client,
		"store-pickup",
		"pickupLocation",
		pickupLocationId,
		{
			id: pickupLocationId,
			name: "86d Flagship - San Francisco",
			address: "123 Commerce St",
			city: "San Francisco",
			state: "CA",
			postalCode: "94102",
			country: "US",
			phone: "+1-555-0100",
			email: "pickup@demo.86d.app",
			latitude: 37.7749,
			longitude: -122.4194,
			preparationMinutes: 60,
			active: true,
			sortOrder: 0,
			createdAt: now,
			updatedAt: now,
		},
	);

	// Pickup windows for weekdays
	for (let day = 1; day <= 5; day++) {
		const windowId = uuid(`pickup-window:${pickupLocationId}:day-${day}`);
		await insertModuleData(
			client,
			"store-pickup",
			"pickupWindow",
			windowId,
			{
				id: windowId,
				locationId: pickupLocationId,
				dayOfWeek: day,
				startTime: "10:00",
				endTime: "18:00",
				capacity: 20,
				active: true,
				sortOrder: day,
				createdAt: now,
				updatedAt: now,
			},
		);
	}
}

async function seedDeliverySlots(client: pg.PoolClient) {
	console.log("  Creating delivery schedules...");
	const schedules = [
		{
			name: "Morning Delivery",
			dayOfWeek: 1,
			startTime: "08:00",
			endTime: "12:00",
			capacity: 10,
			surchargeInCents: 0,
			active: true,
			sortOrder: 0,
		},
		{
			name: "Afternoon Delivery",
			dayOfWeek: 1,
			startTime: "12:00",
			endTime: "17:00",
			capacity: 15,
			surchargeInCents: 0,
			active: true,
			sortOrder: 1,
		},
		{
			name: "Evening Delivery",
			dayOfWeek: 1,
			startTime: "17:00",
			endTime: "21:00",
			capacity: 8,
			surchargeInCents: 500,
			active: true,
			sortOrder: 2,
		},
	];

	for (const schedule of schedules) {
		const scheduleId = uuid(`delivery-schedule:${schedule.name}`);
		await insertModuleData(
			client,
			"delivery-slots",
			"deliverySchedule",
			scheduleId,
			{
				id: scheduleId,
				...schedule,
				createdAt: now,
				updatedAt: now,
			},
		);
	}
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
	console.log("🌱 Seeding 86d demo database...\n");
	console.log(`  Store ID: ${STORE_ID}`);
	console.log(`  Database: ${DATABASE_URL?.replace(/\/\/.*@/, "//***@")}\n`);

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		await seedAdminUser(client);
		await seedModules(client);
		await seedProducts(client);
		await seedCollections(client);
		await seedCustomers(client);
		await seedSettings(client);
		await seedInventory(client);
		await seedNavigation(client);
		await seedDemoOrder(client);

		// Extended module seed data
		await seedBrands(client);
		await seedReviews(client);
		await seedBlog(client);
		await seedPages(client);
		await seedShipping(client);
		await seedTax(client);
		await seedDiscounts(client);
		await seedFaq(client);
		await seedAnnouncements(client);
		await seedSeo(client);
		await seedSearch(client);
		await seedNewsletter(client);
		await seedSocialProof(client);
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
		console.log(`\n  ${products.length} products, ${categories.length} categories, ${collections.length} collections`);
		console.log(`  ${customers.length} customers, ${settings.length} settings, 1 demo order`);
		console.log(`  ${moduleNames.length} modules registered`);
		console.log("  + brands, reviews, blog posts, pages, shipping zones, tax rates");
		console.log("  + discounts, FAQ, announcements, SEO, search index");
		console.log("  + newsletter, social proof, product labels, redirects");
		console.log("  + sitemap config, store locations, pickup windows, delivery slots\n");
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
