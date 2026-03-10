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

import { randomUUID } from "node:crypto";
import { scryptSync, randomBytes } from "node:crypto";

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

const STORE_ID = process.env.STORE_ID || "demo5b9d-c517-4c65-896e-8edef5cf5a94";
const now = new Date().toISOString();

function uuid(): string {
	return randomUUID();
}

/** Hash password using Better Auth's scrypt format: hex-salt:hex-key */
function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const key = scryptSync(password.normalize("NFKC"), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
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

const adminUserId = uuid();
const adminAccountId = uuid();

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
];

for (const name of moduleNames) {
	moduleIds[name] = uuid();
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
	clothing: uuid(),
	accessories: uuid(),
	electronics: uuid(),
	foodDrink: uuid(),
	homeKitchen: uuid(),
	sportsOutdoors: uuid(),
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
		id: uuid(),
		name: "Classic White T-Shirt",
		slug: "classic-white-t-shirt",
		description:
			"A timeless staple crafted from 100% organic cotton. Soft, breathable, and perfect for everyday wear.",
		price: 29.99,
		compareAtPrice: 39.99,
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
		id: uuid(),
		name: "Leather Messenger Bag",
		slug: "leather-messenger-bag",
		description:
			"Handcrafted from full-grain leather with brass hardware. Fits a 15-inch laptop with room for essentials.",
		price: 89.99,
		compareAtPrice: 119.99,
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
		id: uuid(),
		name: "Wireless Bluetooth Headphones",
		slug: "wireless-bluetooth-headphones",
		description:
			"Premium over-ear headphones with active noise cancellation, 30-hour battery life, and Hi-Res audio.",
		price: 149.99,
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
		id: uuid(),
		name: "Organic Coffee Beans",
		slug: "organic-coffee-beans",
		description:
			"Single-origin Ethiopian Yirgacheffe. Medium roast with notes of blueberry, chocolate, and citrus.",
		price: 18.99,
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
		id: uuid(),
		name: "Handcrafted Ceramic Mug",
		slug: "handcrafted-ceramic-mug",
		description:
			"Artisan-made stoneware mug with a reactive glaze finish. Microwave and dishwasher safe. 12oz capacity.",
		price: 24.99,
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
		id: uuid(),
		name: "Running Shoes Pro",
		slug: "running-shoes-pro",
		description:
			"Lightweight performance running shoes with responsive cushioning and breathable mesh upper.",
		price: 119.99,
		compareAtPrice: 149.99,
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
		id: uuid(),
		name: "Bamboo Water Bottle",
		slug: "bamboo-water-bottle",
		description:
			"Sustainable double-walled stainless steel bottle with bamboo cap. Keeps drinks cold 24hrs or hot 12hrs.",
		price: 34.99,
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
		id: uuid(),
		name: "Wool Blend Scarf",
		slug: "wool-blend-scarf",
		description:
			"Luxurious merino wool and cashmere blend scarf. Ultra-soft with a classic herringbone pattern.",
		price: 44.99,
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
	featured: uuid(),
	newArrivals: uuid(),
	bestSellers: uuid(),
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

const customerIds = { john: uuid(), jane: uuid() };

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
	{ key: "store.name", value: "86d Demo Store", group: "general" },
	{
		key: "store.description",
		value: "A demo store powered by 86d",
		group: "general",
	},
	{ key: "store.currency", value: "USD", group: "commerce" },
	{ key: "store.email", value: "hello@demo.86d.app", group: "contact" },
	{ key: "store.phone", value: "+1-555-0100", group: "contact" },
	{
		key: "store.address",
		value: "123 Commerce St, San Francisco, CA 94102",
		group: "contact",
	},
	{ key: "store.timezone", value: "America/Los_Angeles", group: "general" },
	{ key: "store.weightUnit", value: "kg", group: "commerce" },
	{ key: "store.taxInclusive", value: "false", group: "commerce" },
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

async function seedModules(client: pg.PoolClient) {
	console.log("  Creating module records...");
	for (const name of moduleNames) {
		await client.query(
			`INSERT INTO "Module" (id, cuid, name, version, "isEnabled", "storeId", "createdAt", "updatedAt")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT ("storeId", name) DO UPDATE SET "isEnabled" = true, "updatedAt" = $8`,
			[moduleIds[name], cuid(), name, "0.0.4", true, STORE_ID, now, now],
		);
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
	await client.query(
		`INSERT INTO "ModuleData" (id, cuid, "entityType", "entityId", data, "moduleId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT ("moduleId", "entityType", "entityId") DO UPDATE SET data = $5, "updatedAt" = $8`,
		[uuid(), cuid(), entityType, entityId, JSON.stringify(data), modId, now, now],
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
		await insertModuleData(client, "collections", "collection", col.id, {
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
		const linkId = uuid();
		await insertModuleData(
			client,
			"collections",
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
		const linkId = uuid();
		await insertModuleData(
			client,
			"collections",
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
		const linkId = uuid();
		await insertModuleData(
			client,
			"collections",
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
	const addressId = uuid();
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
		const settingId = uuid();
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
		const itemId = uuid();
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
	const mainMenuId = uuid();
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
		const itemId = uuid();
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
	const orderId = uuid();
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
	const item1Id = uuid();
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

	const item2Id = uuid();
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
	const addressId = uuid();
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

		await client.query("COMMIT");

		console.log("\n✅ Seed complete!");
		console.log("\n  Admin credentials:");
		console.log("    Email:    admin@example.com");
		console.log("    Password: password123");
		console.log(`\n  ${products.length} products, ${categories.length} categories, ${collections.length} collections`);
		console.log(`  ${customers.length} customers, ${settings.length} settings, 1 demo order`);
		console.log(`  ${moduleNames.length} modules registered\n`);
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
