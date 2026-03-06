// #!/usr/bin/env tsx
// /**
//  * Database seed script for development
//  * Creates demo data for testing the platform — safe to run multiple times (upsert).
//  *
//  * Usage: bun run db:seed
//  */

// import { db as prisma } from "../src/index";

// /** Deterministic seed IDs — stable across runs so upsert works. */
// const seedCounters: Record<string, number> = {};
// function seedId(prefix: string): string {
// 	seedCounters[prefix] = (seedCounters[prefix] ?? 0) + 1;
// 	return `${prefix}_seed_${String(seedCounters[prefix]).padStart(3, "0")}`;
// }

// const now = new Date().toISOString();
// const timestamps = { createdAt: now, updatedAt: now };

// async function seedModuleData(
// 	moduleId: string,
// 	entityType: string,
// 	// biome-ignore lint/suspicious/noExplicitAny: JSONB data
// 	entities: any[],
// ) {
// 	for (const entity of entities) {
// 		await prisma.moduleData.upsert({
// 			where: {
// 				module_entity_unique: {
// 					moduleId,
// 					entityType,
// 					entityId: entity.id,
// 				},
// 			},
// 			update: { data: { ...entity, ...timestamps } },
// 			create: {
// 				moduleId,
// 				entityType,
// 				entityId: entity.id,
// 				data: { ...entity, ...timestamps },
// 			},
// 		});
// 	}
// }

// async function upsertModule(
// 	storeId: string,
// 	name: string,
// 	settings: Record<string, unknown> = {},
// ) {
// 	return prisma.module.upsert({
// 		where: { storeId_name: { storeId, name } },
// 		update: { settings, isEnabled: true },
// 		create: {
// 			name,
// 			version: "0.0.1",
// 			isEnabled: true,
// 			storeId,
// 			settings,
// 		},
// 	});
// }

// async function main() {
// 	console.log("Seeding database...\n");

// 	// ── 1. User ──────────────────────────────────────────────────────────
// 	console.log("Creating demo user...");
// 	const user = await prisma.user.upsert({
// 		where: { email: "demo@example.com" },
// 		update: {},
// 		create: {
// 			email: "demo@example.com",
// 			name: "Demo User",
// 			emailVerified: true,
// 		},
// 	});
// 	console.log(`  Created user: ${user.email} (${user.cuid})\n`);

// 	// ── 1b. Account (credential login) ───────────────────────────────────
// 	console.log("Creating demo account...");
// 	const existingAccount = await prisma.account.findFirst({
// 		where: { userId: user.id, providerId: "credential" },
// 	});
// 	if (!existingAccount) {
// 		await prisma.account.create({
// 			data: {
// 				accountId: user.id,
// 				providerId: "credential",
// 				password:
// 					"807c240457dffd4871b66d01b866e391:31a80db91f24e81095525fc6c1327860069b62225c6a506fc697adde45d29b13a805060d1fe0d0489bd9b2b7792f59654418a9d626eec0717cdbf48a97cecb01",
// 				userId: user.id,
// 			},
// 		});
// 	}
// 	console.log("  Created credential account\n");

// 	// ── 2. Business ─────────────────────────────────────────────────────
// 	console.log("Creating demo business...");
// 	let business = await prisma.business.findFirst({
// 		where: { name: "Demo Store Inc" },
// 	});
// 	if (!business) {
// 		business = await prisma.business.create({
// 			data: {
// 				name: "Demo Store Inc",
// 				legalName: "Demo Store Inc.",
// 				entityType: "COMPANY",
// 				email: "contact@demostore.com",
// 			},
// 		});
// 	}
// 	console.log(`  Created business: ${business.name} (${business.cuid})\n`);

// 	// ── 3. Member ────────────────────────────────────────────────────────
// 	console.log("Creating member relationship...");
// 	const member = await prisma.member.upsert({
// 		where: {
// 			userId_businessId_role: {
// 				userId: user.id,
// 				businessId: business.id,
// 				role: "OWNER",
// 			},
// 		},
// 		update: {},
// 		create: {
// 			userId: user.id,
// 			businessId: business.id,
// 			role: "OWNER",
// 		},
// 	});
// 	console.log(`  Created member: ${member.role} (${member.cuid})\n`);

// 	// ── 4. Store ─────────────────────────────────────────────────────────
// 	console.log("Creating demo store...");
// 	let store = await prisma.store.findFirst({
// 		where: { name: "Demo Fashion Store", businessId: business.id },
// 	});
// 	if (!store) {
// 		store = await prisma.store.create({
// 			data: {
// 				name: "Demo Fashion Store",
// 				vercelProjectId: "prj_demo_fashion_store",
// 				businessId: business.id,
// 			},
// 		});
// 	}
// 	console.log(`  Created store: ${store.name} (${store.cuid})\n`);

// 	// ── 5. Domain ────────────────────────────────────────────────────────
// 	console.log("Creating store domain...");
// 	let domain = await prisma.domain.findFirst({
// 		where: { name: "demo.localhost", storeId: store.id },
// 	});
// 	if (!domain) {
// 		domain = await prisma.domain.create({
// 			data: {
// 				name: "demo.localhost",
// 				storeId: store.id,
// 			},
// 		});
// 	}
// 	console.log(`  Created domain: ${domain.name}\n`);

// 	// ── 5b. Store Member ────────────────────────────────────────────────
// 	console.log("Creating store member...");
// 	const existingStoreMember = await prisma.storeMember.findFirst({
// 		where: { storeId: store.id, userId: user.id },
// 	});
// 	if (!existingStoreMember) {
// 		await prisma.storeMember.create({
// 			data: {
// 				storeId: store.id,
// 				userId: user.id,
// 				role: "OWNER",
// 			},
// 		});
// 	}
// 	console.log("  Created store member (OWNER)\n");

// 	// ── 6. Modules ───────────────────────────────────────────────────────
// 	console.log("Creating modules...");
// 	const productsModule = await upsertModule(store.id, "products", {
// 		defaultPageSize: 20,
// 		maxPageSize: 100,
// 		trackInventory: true,
// 	});
// 	const cartModule = await upsertModule(store.id, "cart", {
// 		maxItemsPerCart: 50,
// 		cartExpirationDays: 30,
// 	});
// 	const reviewsModule = await upsertModule(store.id, "reviews", {
// 		autoApprove: "false",
// 	});
// 	const shippingModule = await upsertModule(store.id, "shipping");
// 	const discountsModule = await upsertModule(store.id, "discounts");
// 	const customersModule = await upsertModule(store.id, "customers");
// 	const ordersModule = await upsertModule(store.id, "orders");
// 	const inventoryModule = await upsertModule(store.id, "inventory");
// 	const newsletterModule = await upsertModule(store.id, "newsletter");
// 	const checkoutModule = await upsertModule(store.id, "checkout");
// 	const paymentsModule = await upsertModule(store.id, "payments");
// 	const analyticsModule = await upsertModule(store.id, "analytics");
// 	const subscriptionsModule = await upsertModule(store.id, "subscriptions");
// 	const digitalDownloadsModule = await upsertModule(
// 		store.id,
// 		"digital-downloads",
// 	);
// 	await upsertModule(store.id, "stripe", {
// 		publicKey: "pk_test_demo",
// 	});
// 	await upsertModule(store.id, "square");
// 	await upsertModule(store.id, "paypal");
// 	await upsertModule(store.id, "braintree");
// 	const wishlistModule = await upsertModule(store.id, "wishlist");
// 	const taxModule = await upsertModule(store.id, "tax", {
// 		defaultTaxBehavior: "exclusive",
// 	});
// 	const giftCardsModule = await upsertModule(store.id, "gift-cards");
// 	const blogModule = await upsertModule(store.id, "blog");
// 	console.log("  Created 22 modules\n");

// 	// ── 7. Categories ────────────────────────────────────────────────────
// 	console.log("Creating categories...");
// 	const categories = [
// 		{
// 			id: seedId("cat"),
// 			name: "Clothing",
// 			slug: "clothing",
// 			description: "Apparel and fashion items",
// 			position: 0,
// 			isVisible: true,
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("cat"),
// 			name: "Accessories",
// 			slug: "accessories",
// 			description: "Fashion accessories and add-ons",
// 			position: 1,
// 			isVisible: true,
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("cat"),
// 			name: "Footwear",
// 			slug: "footwear",
// 			description: "Shoes, boots, and sandals",
// 			position: 2,
// 			isVisible: true,
// 			metadata: {},
// 		},
// 	];
// 	await seedModuleData(productsModule.id, "category", categories);
// 	console.log(`  Created ${categories.length} categories\n`);

// 	// ── 8. Products (prices in cents) ────────────────────────────────────
// 	console.log("Creating products...");
// 	const products = [
// 		{
// 			id: seedId("prod"),
// 			name: "Classic Cotton T-Shirt",
// 			slug: "classic-cotton-tshirt",
// 			description:
// 				"A comfortable, everyday essential made from 100% organic cotton. Features a relaxed fit and durable construction.",
// 			shortDescription: "Comfortable organic cotton t-shirt",
// 			price: 2999,
// 			compareAtPrice: 3999,
// 			costPrice: 1200,
// 			sku: "TSH-001",
// 			inventory: 150,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[0].id,
// 			images: ["https://placehold.co/600x800/e2e8f0/1e293b?text=T-Shirt"],
// 			tags: ["cotton", "casual", "basics"],
// 			isFeatured: true,
// 			weight: 0.2,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Premium Denim Jeans",
// 			slug: "premium-denim-jeans",
// 			description:
// 				"High-quality denim jeans with a modern slim fit. Made with sustainable materials and built to last.",
// 			shortDescription: "Sustainable slim-fit denim jeans",
// 			price: 8999,
// 			compareAtPrice: 12000,
// 			costPrice: 3500,
// 			sku: "JNS-001",
// 			inventory: 75,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[0].id,
// 			images: ["https://placehold.co/600x800/1e293b/e2e8f0?text=Jeans"],
// 			tags: ["denim", "sustainable", "slim-fit"],
// 			isFeatured: true,
// 			weight: 0.5,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Leather Crossbody Bag",
// 			slug: "leather-crossbody-bag",
// 			description:
// 				"Elegant crossbody bag crafted from genuine Italian leather. Perfect for everyday use with multiple compartments.",
// 			shortDescription: "Italian leather crossbody bag",
// 			price: 14999,
// 			compareAtPrice: null,
// 			costPrice: 6000,
// 			sku: "BAG-001",
// 			inventory: 30,
// 			trackInventory: true,
// 			allowBackorder: true,
// 			status: "active",
// 			categoryId: categories[1].id,
// 			images: ["https://placehold.co/600x800/92400e/fef3c7?text=Bag"],
// 			tags: ["leather", "italian", "everyday"],
// 			isFeatured: false,
// 			weight: 0.4,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Minimalist Watch",
// 			slug: "minimalist-watch",
// 			description:
// 				"Clean, modern design with Japanese quartz movement. Stainless steel case with genuine leather strap.",
// 			shortDescription: "Japanese quartz minimalist watch",
// 			price: 19999,
// 			compareAtPrice: 24999,
// 			costPrice: 8000,
// 			sku: "WCH-001",
// 			inventory: 45,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[1].id,
// 			images: ["https://placehold.co/600x800/374151/f9fafb?text=Watch"],
// 			tags: ["watch", "minimalist", "japanese"],
// 			isFeatured: true,
// 			weight: 0.1,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Running Sneakers",
// 			slug: "running-sneakers",
// 			description:
// 				"Lightweight running shoes with responsive cushioning. Breathable mesh upper and durable rubber outsole.",
// 			shortDescription: "Lightweight breathable running shoes",
// 			price: 12999,
// 			compareAtPrice: 15999,
// 			costPrice: 5000,
// 			sku: "SHO-001",
// 			inventory: 60,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[2].id,
// 			images: ["https://placehold.co/600x800/0284c7/e0f2fe?text=Sneakers"],
// 			tags: ["running", "athletic", "breathable"],
// 			isFeatured: true,
// 			weight: 0.35,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Casual Canvas Slip-Ons",
// 			slug: "casual-canvas-slip-ons",
// 			description:
// 				"Easy-wearing canvas slip-on shoes perfect for casual outings. Cushioned insole for all-day comfort.",
// 			shortDescription: "Comfortable canvas slip-on shoes",
// 			price: 4999,
// 			compareAtPrice: null,
// 			costPrice: 1800,
// 			sku: "SHO-002",
// 			inventory: 100,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[2].id,
// 			images: ["https://placehold.co/600x800/059669/d1fae5?text=Slip-Ons"],
// 			tags: ["canvas", "casual", "comfortable"],
// 			isFeatured: false,
// 			weight: 0.25,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Wool Blend Sweater",
// 			slug: "wool-blend-sweater",
// 			description:
// 				"Cozy wool blend sweater with a relaxed fit. Perfect for layering in cooler weather.",
// 			shortDescription: "Cozy wool blend layering sweater",
// 			price: 7999,
// 			compareAtPrice: 9999,
// 			costPrice: 3000,
// 			sku: "SWT-001",
// 			inventory: 40,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[0].id,
// 			images: ["https://placehold.co/600x800/7c3aed/ede9fe?text=Sweater"],
// 			tags: ["wool", "winter", "cozy"],
// 			isFeatured: false,
// 			weight: 0.4,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("prod"),
// 			name: "Sunglasses - Aviator Style",
// 			slug: "sunglasses-aviator",
// 			description:
// 				"Classic aviator sunglasses with polarized lenses. UV400 protection with metal frame.",
// 			shortDescription: "Polarized aviator sunglasses",
// 			price: 6999,
// 			compareAtPrice: null,
// 			costPrice: 2500,
// 			sku: "SUN-001",
// 			inventory: 80,
// 			trackInventory: true,
// 			allowBackorder: false,
// 			status: "active",
// 			categoryId: categories[1].id,
// 			images: ["https://placehold.co/600x800/f59e0b/fffbeb?text=Sunglasses"],
// 			tags: ["sunglasses", "aviator", "polarized"],
// 			isFeatured: false,
// 			weight: 0.05,
// 			weightUnit: "kg",
// 			metadata: {},
// 		},
// 	];
// 	await seedModuleData(productsModule.id, "product", products);
// 	console.log(`  Created ${products.length} products\n`);

// 	// ── 9. Product variants ──────────────────────────────────────────────
// 	console.log("Creating product variants...");
// 	const tshirtId = products[0].id;
// 	const jeansId = products[1].id;
// 	const sneakersId = products[4].id;
// 	const variants = [
// 		// T-Shirt variants (6)
// 		{
// 			id: seedId("var"),
// 			productId: tshirtId,
// 			name: "Small - White",
// 			sku: "TSH-001-S-WHT",
// 			price: 2999,
// 			inventory: 50,
// 			options: { size: "S", color: "White" },
// 			images: [],
// 			position: 0,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: tshirtId,
// 			name: "Medium - White",
// 			sku: "TSH-001-M-WHT",
// 			price: 2999,
// 			inventory: 50,
// 			options: { size: "M", color: "White" },
// 			images: [],
// 			position: 1,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: tshirtId,
// 			name: "Large - White",
// 			sku: "TSH-001-L-WHT",
// 			price: 2999,
// 			inventory: 30,
// 			options: { size: "L", color: "White" },
// 			images: [],
// 			position: 2,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: tshirtId,
// 			name: "Small - Black",
// 			sku: "TSH-001-S-BLK",
// 			price: 2999,
// 			inventory: 40,
// 			options: { size: "S", color: "Black" },
// 			images: [],
// 			position: 3,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: tshirtId,
// 			name: "Medium - Black",
// 			sku: "TSH-001-M-BLK",
// 			price: 2999,
// 			inventory: 45,
// 			options: { size: "M", color: "Black" },
// 			images: [],
// 			position: 4,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: tshirtId,
// 			name: "Large - Black",
// 			sku: "TSH-001-L-BLK",
// 			price: 2999,
// 			inventory: 25,
// 			options: { size: "L", color: "Black" },
// 			images: [],
// 			position: 5,
// 		},
// 		// Jeans variants (4)
// 		{
// 			id: seedId("var"),
// 			productId: jeansId,
// 			name: "30x30",
// 			sku: "JNS-001-30-30",
// 			price: 8999,
// 			inventory: 20,
// 			options: { waist: "30", length: "30" },
// 			images: [],
// 			position: 0,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: jeansId,
// 			name: "32x32",
// 			sku: "JNS-001-32-32",
// 			price: 8999,
// 			inventory: 25,
// 			options: { waist: "32", length: "32" },
// 			images: [],
// 			position: 1,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: jeansId,
// 			name: "34x32",
// 			sku: "JNS-001-34-32",
// 			price: 8999,
// 			inventory: 20,
// 			options: { waist: "34", length: "32" },
// 			images: [],
// 			position: 2,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: jeansId,
// 			name: "36x34",
// 			sku: "JNS-001-36-34",
// 			price: 8999,
// 			inventory: 10,
// 			options: { waist: "36", length: "34" },
// 			images: [],
// 			position: 3,
// 		},
// 		// Sneakers variants (4)
// 		{
// 			id: seedId("var"),
// 			productId: sneakersId,
// 			name: "US 8",
// 			sku: "SHO-001-8",
// 			price: 12999,
// 			inventory: 15,
// 			options: { size: "US 8" },
// 			images: [],
// 			position: 0,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: sneakersId,
// 			name: "US 9",
// 			sku: "SHO-001-9",
// 			price: 12999,
// 			inventory: 20,
// 			options: { size: "US 9" },
// 			images: [],
// 			position: 1,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: sneakersId,
// 			name: "US 10",
// 			sku: "SHO-001-10",
// 			price: 12999,
// 			inventory: 18,
// 			options: { size: "US 10" },
// 			images: [],
// 			position: 2,
// 		},
// 		{
// 			id: seedId("var"),
// 			productId: sneakersId,
// 			name: "US 11",
// 			sku: "SHO-001-11",
// 			price: 12999,
// 			inventory: 12,
// 			options: { size: "US 11" },
// 			images: [],
// 			position: 3,
// 		},
// 	];
// 	await seedModuleData(productsModule.id, "productVariant", variants);
// 	console.log(`  Created ${variants.length} product variants\n`);

// 	// ── 10. Customers ────────────────────────────────────────────────────
// 	console.log("Creating customers...");
// 	const customers = [
// 		{
// 			id: seedId("cust"),
// 			email: "alice.johnson@example.com",
// 			firstName: "Alice",
// 			lastName: "Johnson",
// 			phone: "+1-555-0101",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("cust"),
// 			email: "bob.smith@example.com",
// 			firstName: "Bob",
// 			lastName: "Smith",
// 			phone: "+1-555-0102",
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("cust"),
// 			email: "carol.davis@example.com",
// 			firstName: "Carol",
// 			lastName: "Davis",
// 			phone: null,
// 			metadata: {},
// 		},
// 	];
// 	await seedModuleData(customersModule.id, "customer", customers);

// 	const customerAddresses = [
// 		{
// 			id: seedId("addr"),
// 			customerId: customers[0].id,
// 			type: "shipping",
// 			firstName: "Alice",
// 			lastName: "Johnson",
// 			line1: "123 Main St",
// 			line2: "Apt 4B",
// 			city: "Portland",
// 			state: "OR",
// 			postalCode: "97201",
// 			country: "US",
// 			isDefault: true,
// 		},
// 		{
// 			id: seedId("addr"),
// 			customerId: customers[0].id,
// 			type: "billing",
// 			firstName: "Alice",
// 			lastName: "Johnson",
// 			line1: "123 Main St",
// 			line2: "Apt 4B",
// 			city: "Portland",
// 			state: "OR",
// 			postalCode: "97201",
// 			country: "US",
// 			isDefault: true,
// 		},
// 		{
// 			id: seedId("addr"),
// 			customerId: customers[1].id,
// 			type: "shipping",
// 			firstName: "Bob",
// 			lastName: "Smith",
// 			line1: "456 Oak Ave",
// 			city: "Seattle",
// 			state: "WA",
// 			postalCode: "98101",
// 			country: "US",
// 			isDefault: true,
// 		},
// 		{
// 			id: seedId("addr"),
// 			customerId: customers[2].id,
// 			type: "shipping",
// 			firstName: "Carol",
// 			lastName: "Davis",
// 			line1: "789 Elm Blvd",
// 			line2: "Suite 200",
// 			city: "San Francisco",
// 			state: "CA",
// 			postalCode: "94102",
// 			country: "US",
// 			isDefault: true,
// 		},
// 	];
// 	await seedModuleData(
// 		customersModule.id,
// 		"customerAddress",
// 		customerAddresses,
// 	);
// 	console.log(
// 		`  Created ${customers.length} customers, ${customerAddresses.length} addresses\n`,
// 	);

// 	// ── 11. Orders ───────────────────────────────────────────────────────
// 	console.log("Creating orders...");
// 	const pastDate = (daysAgo: number) =>
// 		new Date(Date.now() - daysAgo * 86400000).toISOString();

// 	const orders = [
// 		{
// 			id: seedId("ord"),
// 			orderNumber: "ORD-001",
// 			customerId: customers[0].id,
// 			status: "completed",
// 			paymentStatus: "paid",
// 			subtotal: 5998,
// 			taxAmount: 480,
// 			shippingAmount: 599,
// 			discountAmount: 0,
// 			total: 7077,
// 			currency: "USD",
// 			metadata: {},
// 			createdAt: pastDate(14),
// 			updatedAt: pastDate(12),
// 		},
// 		{
// 			id: seedId("ord"),
// 			orderNumber: "ORD-002",
// 			customerId: customers[1].id,
// 			status: "processing",
// 			paymentStatus: "paid",
// 			subtotal: 8999,
// 			taxAmount: 720,
// 			shippingAmount: 599,
// 			discountAmount: 0,
// 			total: 10318,
// 			currency: "USD",
// 			metadata: {},
// 			createdAt: pastDate(5),
// 			updatedAt: pastDate(4),
// 		},
// 		{
// 			id: seedId("ord"),
// 			orderNumber: "ORD-003",
// 			customerId: customers[2].id,
// 			status: "pending",
// 			paymentStatus: "unpaid",
// 			subtotal: 19999,
// 			taxAmount: 1600,
// 			shippingAmount: 0,
// 			discountAmount: 1500,
// 			total: 20099,
// 			currency: "USD",
// 			notes: "Customer requested gift wrapping",
// 			metadata: {},
// 			createdAt: pastDate(2),
// 			updatedAt: pastDate(2),
// 		},
// 		{
// 			id: seedId("ord"),
// 			orderNumber: "ORD-004",
// 			customerId: customers[0].id,
// 			status: "completed",
// 			paymentStatus: "paid",
// 			subtotal: 12999,
// 			taxAmount: 1040,
// 			shippingAmount: 1299,
// 			discountAmount: 0,
// 			total: 15338,
// 			currency: "USD",
// 			metadata: {},
// 			createdAt: pastDate(30),
// 			updatedAt: pastDate(25),
// 		},
// 		{
// 			id: seedId("ord"),
// 			orderNumber: "ORD-005",
// 			customerId: customers[1].id,
// 			status: "cancelled",
// 			paymentStatus: "voided",
// 			subtotal: 6999,
// 			taxAmount: 560,
// 			shippingAmount: 599,
// 			discountAmount: 0,
// 			total: 8158,
// 			currency: "USD",
// 			notes: "Customer changed mind",
// 			metadata: {},
// 			createdAt: pastDate(10),
// 			updatedAt: pastDate(9),
// 		},
// 	];

// 	// Orders have custom timestamps — upsert directly
// 	for (const order of orders) {
// 		await prisma.moduleData.upsert({
// 			where: {
// 				module_entity_unique: {
// 					moduleId: ordersModule.id,
// 					entityType: "order",
// 					entityId: order.id,
// 				},
// 			},
// 			update: { data: order },
// 			create: {
// 				moduleId: ordersModule.id,
// 				entityType: "order",
// 				entityId: order.id,
// 				data: order,
// 			},
// 		});
// 	}

// 	const orderItems = [
// 		// ORD-001: 2x T-Shirt
// 		{
// 			id: seedId("oi"),
// 			orderId: orders[0].id,
// 			productId: products[0].id,
// 			name: "Classic Cotton T-Shirt",
// 			sku: "TSH-001",
// 			price: 2999,
// 			quantity: 2,
// 			subtotal: 5998,
// 		},
// 		// ORD-002: 1x Jeans
// 		{
// 			id: seedId("oi"),
// 			orderId: orders[1].id,
// 			productId: products[1].id,
// 			name: "Premium Denim Jeans",
// 			sku: "JNS-001",
// 			price: 8999,
// 			quantity: 1,
// 			subtotal: 8999,
// 		},
// 		// ORD-003: 1x Watch
// 		{
// 			id: seedId("oi"),
// 			orderId: orders[2].id,
// 			productId: products[3].id,
// 			name: "Minimalist Watch",
// 			sku: "WCH-001",
// 			price: 19999,
// 			quantity: 1,
// 			subtotal: 19999,
// 		},
// 		// ORD-004: 1x Sneakers
// 		{
// 			id: seedId("oi"),
// 			orderId: orders[3].id,
// 			productId: products[4].id,
// 			name: "Running Sneakers",
// 			sku: "SHO-001",
// 			price: 12999,
// 			quantity: 1,
// 			subtotal: 12999,
// 		},
// 		// ORD-005: 1x Sunglasses
// 		{
// 			id: seedId("oi"),
// 			orderId: orders[4].id,
// 			productId: products[7].id,
// 			name: "Sunglasses - Aviator Style",
// 			sku: "SUN-001",
// 			price: 6999,
// 			quantity: 1,
// 			subtotal: 6999,
// 		},
// 	];
// 	await seedModuleData(ordersModule.id, "orderItem", orderItems);

// 	const orderAddresses = [
// 		// ORD-001 shipping
// 		{
// 			id: seedId("oa"),
// 			orderId: orders[0].id,
// 			type: "shipping",
// 			firstName: "Alice",
// 			lastName: "Johnson",
// 			line1: "123 Main St",
// 			line2: "Apt 4B",
// 			city: "Portland",
// 			state: "OR",
// 			postalCode: "97201",
// 			country: "US",
// 		},
// 		// ORD-002 shipping
// 		{
// 			id: seedId("oa"),
// 			orderId: orders[1].id,
// 			type: "shipping",
// 			firstName: "Bob",
// 			lastName: "Smith",
// 			line1: "456 Oak Ave",
// 			city: "Seattle",
// 			state: "WA",
// 			postalCode: "98101",
// 			country: "US",
// 		},
// 		// ORD-003 shipping
// 		{
// 			id: seedId("oa"),
// 			orderId: orders[2].id,
// 			type: "shipping",
// 			firstName: "Carol",
// 			lastName: "Davis",
// 			line1: "789 Elm Blvd",
// 			line2: "Suite 200",
// 			city: "San Francisco",
// 			state: "CA",
// 			postalCode: "94102",
// 			country: "US",
// 		},
// 		// ORD-004 shipping
// 		{
// 			id: seedId("oa"),
// 			orderId: orders[3].id,
// 			type: "shipping",
// 			firstName: "Alice",
// 			lastName: "Johnson",
// 			line1: "123 Main St",
// 			line2: "Apt 4B",
// 			city: "Portland",
// 			state: "OR",
// 			postalCode: "97201",
// 			country: "US",
// 		},
// 		// ORD-005 shipping
// 		{
// 			id: seedId("oa"),
// 			orderId: orders[4].id,
// 			type: "shipping",
// 			firstName: "Bob",
// 			lastName: "Smith",
// 			line1: "456 Oak Ave",
// 			city: "Seattle",
// 			state: "WA",
// 			postalCode: "98101",
// 			country: "US",
// 		},
// 	];
// 	await seedModuleData(ordersModule.id, "orderAddress", orderAddresses);
// 	console.log(
// 		`  Created ${orders.length} orders, ${orderItems.length} items, ${orderAddresses.length} addresses\n`,
// 	);

// 	// ── 12. Inventory ────────────────────────────────────────────────────
// 	console.log("Creating inventory items...");
// 	const inventoryItems = products.map((p) => ({
// 		id: `${p.id}:_:_`,
// 		productId: p.id,
// 		quantity: p.inventory,
// 		reserved: p.id === products[3].id ? 2 : 0,
// 		lowStockThreshold: 10,
// 		allowBackorder: p.allowBackorder,
// 	}));

// 	const variantInventoryItems = variants.map((v) => ({
// 		id: `${v.productId}:${v.id}:_`,
// 		productId: v.productId,
// 		variantId: v.id,
// 		quantity: v.inventory,
// 		reserved: 0,
// 		lowStockThreshold: 5,
// 		allowBackorder: false,
// 	}));

// 	await seedModuleData(inventoryModule.id, "inventoryItem", [
// 		...inventoryItems,
// 		...variantInventoryItems,
// 	]);
// 	console.log(
// 		`  Created ${inventoryItems.length + variantInventoryItems.length} inventory items\n`,
// 	);

// 	// ── 13. Shipping zones & rates ───────────────────────────────────────
// 	console.log("Creating shipping zones & rates...");
// 	const shippingZones = [
// 		{
// 			id: seedId("zone"),
// 			name: "Domestic (US)",
// 			countries: ["US"],
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("zone"),
// 			name: "Canada",
// 			countries: ["CA"],
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("zone"),
// 			name: "International",
// 			countries: [],
// 			isActive: true,
// 		},
// 	];
// 	await seedModuleData(shippingModule.id, "shippingZone", shippingZones);

// 	const shippingRates = [
// 		{
// 			id: seedId("rate"),
// 			zoneId: shippingZones[0].id,
// 			name: "Standard Shipping",
// 			price: 599,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("rate"),
// 			zoneId: shippingZones[0].id,
// 			name: "Express Shipping",
// 			price: 1299,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("rate"),
// 			zoneId: shippingZones[0].id,
// 			name: "Free Shipping (orders over $75)",
// 			price: 0,
// 			minOrderAmount: 7500,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("rate"),
// 			zoneId: shippingZones[1].id,
// 			name: "Standard Shipping",
// 			price: 1499,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("rate"),
// 			zoneId: shippingZones[2].id,
// 			name: "International Shipping",
// 			price: 2499,
// 			isActive: true,
// 		},
// 	];
// 	await seedModuleData(shippingModule.id, "shippingRate", shippingRates);
// 	console.log(
// 		`  Created ${shippingZones.length} zones, ${shippingRates.length} rates\n`,
// 	);

// 	// ── 14. Discounts & codes ────────────────────────────────────────────
// 	console.log("Creating discounts...");
// 	const discounts = [
// 		{
// 			id: seedId("disc"),
// 			name: "Welcome 10% Off",
// 			description: "10% off your first order",
// 			type: "percentage",
// 			value: 10,
// 			usedCount: 0,
// 			isActive: true,
// 			appliesTo: "all",
// 			appliesToIds: [],
// 			stackable: false,
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("disc"),
// 			name: "Summer Sale $15 Off",
// 			description: "$15 off orders over $75",
// 			type: "fixed_amount",
// 			value: 1500,
// 			minimumAmount: 7500,
// 			maximumUses: 100,
// 			usedCount: 12,
// 			isActive: true,
// 			appliesTo: "all",
// 			appliesToIds: [],
// 			stackable: false,
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("disc"),
// 			name: "Free Shipping Promo",
// 			description: "Free shipping on orders over $50",
// 			type: "free_shipping",
// 			value: 0,
// 			minimumAmount: 5000,
// 			usedCount: 5,
// 			isActive: true,
// 			appliesTo: "all",
// 			appliesToIds: [],
// 			stackable: true,
// 			metadata: {},
// 		},
// 	];
// 	await seedModuleData(discountsModule.id, "discount", discounts);

// 	const discountCodes = [
// 		{
// 			id: seedId("code"),
// 			discountId: discounts[0].id,
// 			code: "WELCOME10",
// 			usedCount: 0,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("code"),
// 			discountId: discounts[1].id,
// 			code: "SUMMER15",
// 			usedCount: 12,
// 			maximumUses: 100,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("code"),
// 			discountId: discounts[2].id,
// 			code: "FREESHIP",
// 			usedCount: 5,
// 			isActive: true,
// 		},
// 	];
// 	await seedModuleData(discountsModule.id, "discountCode", discountCodes);
// 	console.log(
// 		`  Created ${discounts.length} discounts, ${discountCodes.length} codes\n`,
// 	);

// 	// ── 15. Reviews ──────────────────────────────────────────────────────
// 	console.log("Creating reviews...");
// 	const reviews = [
// 		// T-Shirt reviews (4)
// 		{
// 			id: seedId("rev"),
// 			productId: products[0].id,
// 			authorName: "Jane D.",
// 			authorEmail: "jane@example.com",
// 			rating: 5,
// 			title: "Perfect everyday shirt",
// 			body: "This t-shirt is incredibly soft and comfortable. The organic cotton feels premium and the fit is exactly what I wanted. Already ordered two more!",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 8,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[0].id,
// 			authorName: "Mike R.",
// 			authorEmail: "mike@example.com",
// 			rating: 4,
// 			title: "Great quality, runs slightly large",
// 			body: "Love the quality of the cotton. Only thing is it runs a bit large, so consider sizing down. Otherwise, fantastic shirt.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 5,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[0].id,
// 			authorName: "Sarah L.",
// 			authorEmail: "sarah@example.com",
// 			rating: 5,
// 			title: "Best basic tee I've found",
// 			body: "I've tried dozens of basic tees and this is by far the best. Washes well, doesn't shrink, and the color stays vibrant.",
// 			status: "approved",
// 			isVerifiedPurchase: false,
// 			helpfulCount: 3,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[0].id,
// 			authorName: "Tom K.",
// 			authorEmail: "tom@example.com",
// 			rating: 4,
// 			title: "Solid purchase",
// 			body: "Good t-shirt for the price. Comfortable and durable. Would buy again.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 1,
// 		},

// 		// Jeans reviews (3)
// 		{
// 			id: seedId("rev"),
// 			productId: products[1].id,
// 			authorName: "Lisa M.",
// 			authorEmail: "lisa@example.com",
// 			rating: 5,
// 			title: "Amazing fit and quality",
// 			body: "These jeans fit like a dream. The denim is thick enough to last but still comfortable from day one. Love the sustainable approach too.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 12,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[1].id,
// 			authorName: "James P.",
// 			authorEmail: "james@example.com",
// 			rating: 4,
// 			title: "Great jeans, worth the price",
// 			body: "High quality denim. The slim fit is modern without being too tight. Held up well after several washes.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 4,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[1].id,
// 			authorName: "Anna W.",
// 			authorEmail: "anna@example.com",
// 			rating: 3,
// 			title: "Nice but a bit stiff at first",
// 			body: "Took a few wears to break in. Once broken in, they're very comfortable. The quality is undeniable though.",
// 			status: "approved",
// 			isVerifiedPurchase: false,
// 			helpfulCount: 2,
// 		},

// 		// Bag reviews (2)
// 		{
// 			id: seedId("rev"),
// 			productId: products[2].id,
// 			authorName: "Rachel G.",
// 			authorEmail: "rachel@example.com",
// 			rating: 5,
// 			title: "Beautiful craftsmanship",
// 			body: "The leather quality is outstanding. Plenty of compartments and the crossbody strap is adjustable. Gets compliments everywhere I go.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 7,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[2].id,
// 			authorName: "David H.",
// 			authorEmail: "david@example.com",
// 			rating: 4,
// 			title: "Great gift",
// 			body: "Bought this as a gift for my wife. She loves it. The Italian leather smells amazing and looks even better in person.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 3,
// 		},

// 		// Watch reviews (3)
// 		{
// 			id: seedId("rev"),
// 			productId: products[3].id,
// 			authorName: "Chris B.",
// 			authorEmail: "chris@example.com",
// 			rating: 5,
// 			title: "Elegant and precise",
// 			body: "This watch is stunning. The minimalist design goes with everything. Japanese movement keeps perfect time. Very happy with this purchase.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 10,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[3].id,
// 			authorName: "Emily F.",
// 			authorEmail: "emily@example.com",
// 			rating: 5,
// 			title: "Worth every penny",
// 			body: "I was hesitant at the price point but this watch exceeded my expectations. The leather strap is genuine and the face is crystal clear.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 6,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[3].id,
// 			authorName: "Kevin S.",
// 			authorEmail: "kevin@example.com",
// 			rating: 4,
// 			title: "Clean design",
// 			body: "Love the minimalist look. Only wish the strap was a bit wider. Otherwise, a solid everyday watch.",
// 			status: "approved",
// 			isVerifiedPurchase: false,
// 			helpfulCount: 2,
// 		},

// 		// Sneakers reviews (3)
// 		{
// 			id: seedId("rev"),
// 			productId: products[4].id,
// 			authorName: "Amy T.",
// 			authorEmail: "amy@example.com",
// 			rating: 4,
// 			title: "Great for daily runs",
// 			body: "Light and responsive. My feet don't get tired even after long runs. The mesh keeps them cool in summer too.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 9,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[4].id,
// 			authorName: "Marcus J.",
// 			authorEmail: "marcus@example.com",
// 			rating: 5,
// 			title: "Best running shoes I've owned",
// 			body: "Incredible cushioning without being heavy. The grip is fantastic on both road and trail. Highly recommend for serious runners.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 14,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[4].id,
// 			authorName: "Nina C.",
// 			authorEmail: "nina@example.com",
// 			rating: 3,
// 			title: "Good but narrow",
// 			body: "Performance is great but they run narrow. If you have wide feet, size up. Otherwise a very capable running shoe.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 5,
// 		},

// 		// Sweater reviews (2)
// 		{
// 			id: seedId("rev"),
// 			productId: products[6].id,
// 			authorName: "Olivia N.",
// 			authorEmail: "olivia@example.com",
// 			rating: 4,
// 			title: "So cozy",
// 			body: "Perfect for fall and winter. The wool blend is soft and not itchy at all. Love layering this over a shirt.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 4,
// 		},
// 		{
// 			id: seedId("rev"),
// 			productId: products[6].id,
// 			authorName: "Paul A.",
// 			authorEmail: "paul@example.com",
// 			rating: 5,
// 			title: "My go-to sweater",
// 			body: "This has become my favorite sweater. Warm, comfortable, and looks great. The relaxed fit is just right.",
// 			status: "approved",
// 			isVerifiedPurchase: true,
// 			helpfulCount: 2,
// 		},
// 	];
// 	await seedModuleData(reviewsModule.id, "review", reviews);
// 	console.log(`  Created ${reviews.length} reviews\n`);

// 	// ── 16. Newsletter subscribers ───────────────────────────────────────
// 	console.log("Creating newsletter subscribers...");
// 	const subscribers = [
// 		{
// 			id: seedId("sub"),
// 			email: "alice.johnson@example.com",
// 			firstName: "Alice",
// 			lastName: "Johnson",
// 			status: "active",
// 			source: "checkout",
// 			tags: ["customer"],
// 			metadata: {},
// 			subscribedAt: pastDate(30),
// 		},
// 		{
// 			id: seedId("sub"),
// 			email: "bob.smith@example.com",
// 			firstName: "Bob",
// 			lastName: "Smith",
// 			status: "active",
// 			source: "checkout",
// 			tags: ["customer"],
// 			metadata: {},
// 			subscribedAt: pastDate(20),
// 		},
// 		{
// 			id: seedId("sub"),
// 			email: "newsletter-fan@example.com",
// 			firstName: "Dave",
// 			lastName: "Wilson",
// 			status: "active",
// 			source: "website",
// 			tags: ["website-signup"],
// 			metadata: {},
// 			subscribedAt: pastDate(45),
// 		},
// 		{
// 			id: seedId("sub"),
// 			email: "fashion-lover@example.com",
// 			firstName: "Emma",
// 			lastName: "Brown",
// 			status: "active",
// 			source: "footer",
// 			tags: ["footer-signup", "promotions"],
// 			metadata: {},
// 			subscribedAt: pastDate(15),
// 		},
// 		{
// 			id: seedId("sub"),
// 			email: "deals-hunter@example.com",
// 			firstName: "Frank",
// 			lastName: "Garcia",
// 			status: "active",
// 			source: "website",
// 			tags: ["website-signup"],
// 			metadata: {},
// 			subscribedAt: pastDate(7),
// 		},
// 	];
// 	await seedModuleData(newsletterModule.id, "subscriber", subscribers);
// 	console.log(`  Created ${subscribers.length} subscribers\n`);

// 	// ── 17. Active carts ────────────────────────────────────────────────
// 	console.log("Creating carts...");
// 	const futureDate = (daysFromNow: number) =>
// 		new Date(Date.now() + daysFromNow * 86400000).toISOString();

// 	const carts = [
// 		{
// 			id: seedId("cart"),
// 			customerId: customers[0].id,
// 			status: "active",
// 			expiresAt: futureDate(30),
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("cart"),
// 			guestId: "guest_abc123",
// 			status: "active",
// 			expiresAt: futureDate(7),
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("cart"),
// 			customerId: customers[2].id,
// 			status: "abandoned",
// 			expiresAt: pastDate(-5),
// 			metadata: {
// 				recoveryEmailSentAt: pastDate(3).toISOString(),
// 				recoveryEmailCount: 1,
// 			},
// 			createdAt: pastDate(10),
// 			updatedAt: pastDate(5),
// 		},
// 	];

// 	for (const cart of carts) {
// 		await prisma.moduleData.upsert({
// 			where: {
// 				module_entity_unique: {
// 					moduleId: cartModule.id,
// 					entityType: "cart",
// 					entityId: cart.id,
// 				},
// 			},
// 			update: { data: { ...cart, ...timestamps } },
// 			create: {
// 				moduleId: cartModule.id,
// 				entityType: "cart",
// 				entityId: cart.id,
// 				data: cart.createdAt ? cart : { ...cart, ...timestamps },
// 			},
// 		});
// 	}

// 	const cartItems = [
// 		// Alice's cart: T-Shirt + Watch
// 		{
// 			id: seedId("ci"),
// 			cartId: carts[0].id,
// 			productId: products[0].id,
// 			variantId: variants[1].id,
// 			quantity: 1,
// 			price: 2999,
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("ci"),
// 			cartId: carts[0].id,
// 			productId: products[3].id,
// 			quantity: 1,
// 			price: 19999,
// 			metadata: {},
// 		},
// 		// Guest cart: Sneakers
// 		{
// 			id: seedId("ci"),
// 			cartId: carts[1].id,
// 			productId: products[4].id,
// 			variantId: variants[11].id,
// 			quantity: 1,
// 			price: 12999,
// 			metadata: {},
// 		},
// 		// Carol's abandoned cart: Bag + Sweater
// 		{
// 			id: seedId("ci"),
// 			cartId: carts[2].id,
// 			productId: products[2].id,
// 			quantity: 1,
// 			price: 14999,
// 			metadata: {},
// 		},
// 		{
// 			id: seedId("ci"),
// 			cartId: carts[2].id,
// 			productId: products[6].id,
// 			quantity: 2,
// 			price: 7999,
// 			metadata: {},
// 		},
// 	];
// 	await seedModuleData(cartModule.id, "cartItem", cartItems);
// 	console.log(`  Created ${carts.length} carts, ${cartItems.length} items\n`);

// 	// ── 18. Subscription plans & subscriptions ──────────────────────────
// 	console.log("Creating subscription plans...");
// 	const subscriptionPlans = [
// 		{
// 			id: seedId("plan"),
// 			name: "Style Box - Monthly",
// 			description:
// 				"Curated monthly fashion box with 3-5 items. Free returns on everything.",
// 			price: 4999,
// 			currency: "USD",
// 			interval: "month",
// 			intervalCount: 1,
// 			trialDays: 14,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("plan"),
// 			name: "Style Box - Annual",
// 			description:
// 				"Save 20% with annual subscription. Curated fashion box every month.",
// 			price: 47988,
// 			currency: "USD",
// 			interval: "year",
// 			intervalCount: 1,
// 			trialDays: 14,
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("plan"),
// 			name: "Premium Essentials - Quarterly",
// 			description:
// 				"Premium basics delivered every 3 months. Organic cotton tees, socks, and underwear.",
// 			price: 7999,
// 			currency: "USD",
// 			interval: "month",
// 			intervalCount: 3,
// 			isActive: true,
// 		},
// 	];
// 	await seedModuleData(
// 		subscriptionsModule.id,
// 		"subscriptionPlan",
// 		subscriptionPlans,
// 	);

// 	const subscriptions = [
// 		{
// 			id: seedId("sub_active"),
// 			planId: subscriptionPlans[0].id,
// 			customerId: customers[0].id,
// 			email: customers[0].email,
// 			status: "active",
// 			currentPeriodStart: pastDate(15),
// 			currentPeriodEnd: futureDate(15),
// 			cancelAtPeriodEnd: false,
// 		},
// 		{
// 			id: seedId("sub_active"),
// 			planId: subscriptionPlans[2].id,
// 			customerId: customers[1].id,
// 			email: customers[1].email,
// 			status: "active",
// 			currentPeriodStart: pastDate(30),
// 			currentPeriodEnd: futureDate(60),
// 			cancelAtPeriodEnd: false,
// 		},
// 		{
// 			id: seedId("sub_active"),
// 			planId: subscriptionPlans[0].id,
// 			customerId: customers[2].id,
// 			email: customers[2].email,
// 			status: "trialing",
// 			currentPeriodStart: pastDate(5),
// 			currentPeriodEnd: futureDate(9),
// 			trialStart: pastDate(5),
// 			trialEnd: futureDate(9),
// 			cancelAtPeriodEnd: false,
// 		},
// 	];
// 	await seedModuleData(subscriptionsModule.id, "subscription", subscriptions);
// 	console.log(
// 		`  Created ${subscriptionPlans.length} plans, ${subscriptions.length} subscriptions\n`,
// 	);

// 	// ── 19. Digital downloads ───────────────────────────────────────────
// 	console.log("Creating digital downloads...");
// 	const downloadableFiles = [
// 		{
// 			id: seedId("file"),
// 			productId: products[3].id,
// 			name: "Watch User Manual (PDF)",
// 			url: "https://cdn.example.com/files/watch-manual.pdf",
// 			fileSize: 2_450_000,
// 			mimeType: "application/pdf",
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("file"),
// 			productId: products[3].id,
// 			name: "Watch Warranty Card",
// 			url: "https://cdn.example.com/files/warranty-card.pdf",
// 			fileSize: 850_000,
// 			mimeType: "application/pdf",
// 			isActive: true,
// 		},
// 		{
// 			id: seedId("file"),
// 			productId: products[4].id,
// 			name: "Running Guide (PDF)",
// 			url: "https://cdn.example.com/files/running-guide.pdf",
// 			fileSize: 5_200_000,
// 			mimeType: "application/pdf",
// 			isActive: true,
// 		},
// 	];
// 	await seedModuleData(
// 		digitalDownloadsModule.id,
// 		"downloadableFile",
// 		downloadableFiles,
// 	);

// 	const downloadTokens = [
// 		{
// 			id: seedId("token"),
// 			token: "dl_tok_alice_manual",
// 			fileId: downloadableFiles[0].id,
// 			orderId: orders[2].id,
// 			email: customers[0].email,
// 			maxDownloads: 5,
// 			downloadCount: 1,
// 			expiresAt: futureDate(90),
// 		},
// 		{
// 			id: seedId("token"),
// 			token: "dl_tok_alice_warranty",
// 			fileId: downloadableFiles[1].id,
// 			orderId: orders[2].id,
// 			email: customers[0].email,
// 			maxDownloads: 5,
// 			downloadCount: 0,
// 			expiresAt: futureDate(90),
// 		},
// 	];
// 	await seedModuleData(
// 		digitalDownloadsModule.id,
// 		"downloadToken",
// 		downloadTokens,
// 	);
// 	console.log(
// 		`  Created ${downloadableFiles.length} files, ${downloadTokens.length} tokens\n`,
// 	);

// 	// ── 20. Payment intents & methods ───────────────────────────────────
// 	console.log("Creating payment data...");
// 	const paymentMethods = [
// 		{
// 			id: seedId("pm"),
// 			customerId: customers[0].id,
// 			providerMethodId: "pm_demo_alice_visa",
// 			type: "card",
// 			last4: "4242",
// 			brand: "Visa",
// 			expiryMonth: 12,
// 			expiryYear: 2027,
// 			isDefault: true,
// 		},
// 		{
// 			id: seedId("pm"),
// 			customerId: customers[1].id,
// 			providerMethodId: "pm_demo_bob_mc",
// 			type: "card",
// 			last4: "5555",
// 			brand: "Mastercard",
// 			expiryMonth: 8,
// 			expiryYear: 2026,
// 			isDefault: true,
// 		},
// 	];
// 	await seedModuleData(paymentsModule.id, "paymentMethod", paymentMethods);

// 	const paymentIntents = [
// 		// ORD-001 (completed)
// 		{
// 			id: seedId("pi"),
// 			providerIntentId: "pi_demo_001",
// 			customerId: customers[0].id,
// 			email: customers[0].email,
// 			amount: 7077,
// 			currency: "USD",
// 			status: "succeeded",
// 			paymentMethodId: paymentMethods[0].id,
// 			orderId: orders[0].id,
// 			metadata: {},
// 			providerMetadata: {},
// 		},
// 		// ORD-002 (processing)
// 		{
// 			id: seedId("pi"),
// 			providerIntentId: "pi_demo_002",
// 			customerId: customers[1].id,
// 			email: customers[1].email,
// 			amount: 10318,
// 			currency: "USD",
// 			status: "succeeded",
// 			paymentMethodId: paymentMethods[1].id,
// 			orderId: orders[1].id,
// 			metadata: {},
// 			providerMetadata: {},
// 		},
// 		// ORD-004 (completed)
// 		{
// 			id: seedId("pi"),
// 			providerIntentId: "pi_demo_004",
// 			customerId: customers[0].id,
// 			email: customers[0].email,
// 			amount: 15338,
// 			currency: "USD",
// 			status: "succeeded",
// 			paymentMethodId: paymentMethods[0].id,
// 			orderId: orders[3].id,
// 			metadata: {},
// 			providerMetadata: {},
// 		},
// 		// ORD-005 (cancelled — payment failed)
// 		{
// 			id: seedId("pi"),
// 			providerIntentId: "pi_demo_005",
// 			customerId: customers[1].id,
// 			email: customers[1].email,
// 			amount: 8158,
// 			currency: "USD",
// 			status: "cancelled",
// 			paymentMethodId: paymentMethods[1].id,
// 			orderId: orders[4].id,
// 			metadata: {},
// 			providerMetadata: {},
// 		},
// 	];
// 	await seedModuleData(paymentsModule.id, "paymentIntent", paymentIntents);
// 	console.log(
// 		`  Created ${paymentMethods.length} methods, ${paymentIntents.length} intents\n`,
// 	);

// 	// ── 21. Checkout sessions ───────────────────────────────────────────
// 	console.log("Creating checkout sessions...");
// 	const checkoutSessions = [
// 		// Active checkout for the guest cart
// 		{
// 			id: seedId("chk"),
// 			cartId: carts[1].id,
// 			guestEmail: "guest-shopper@example.com",
// 			status: "pending",
// 			shippingAddress: {
// 				firstName: "Guest",
// 				lastName: "Shopper",
// 				line1: "100 Market St",
// 				city: "Austin",
// 				state: "TX",
// 				postalCode: "73301",
// 				country: "US",
// 			},
// 			lineItems: [
// 				{
// 					productId: products[4].id,
// 					variantId: variants[11].id,
// 					name: "Running Sneakers - US 9",
// 					price: 12999,
// 					quantity: 1,
// 				},
// 			],
// 			subtotal: 12999,
// 			taxAmount: 1040,
// 			shippingAmount: 599,
// 			discountAmount: 0,
// 			total: 14638,
// 			currency: "USD",
// 			metadata: {},
// 		},
// 		// Completed checkout matching ORD-001
// 		{
// 			id: seedId("chk"),
// 			cartId: null,
// 			customerId: customers[0].id,
// 			status: "completed",
// 			orderId: orders[0].id,
// 			lineItems: [
// 				{
// 					productId: products[0].id,
// 					name: "Classic Cotton T-Shirt",
// 					price: 2999,
// 					quantity: 2,
// 				},
// 			],
// 			subtotal: 5998,
// 			taxAmount: 480,
// 			shippingAmount: 599,
// 			discountAmount: 0,
// 			total: 7077,
// 			currency: "USD",
// 			metadata: {},
// 			createdAt: pastDate(14),
// 			updatedAt: pastDate(14),
// 		},
// 	];

// 	for (const session of checkoutSessions) {
// 		await prisma.moduleData.upsert({
// 			where: {
// 				module_entity_unique: {
// 					moduleId: checkoutModule.id,
// 					entityType: "checkout",
// 					entityId: session.id,
// 				},
// 			},
// 			update: {
// 				data: session.createdAt ? session : { ...session, ...timestamps },
// 			},
// 			create: {
// 				moduleId: checkoutModule.id,
// 				entityType: "checkout",
// 				entityId: session.id,
// 				data: session.createdAt ? session : { ...session, ...timestamps },
// 			},
// 		});
// 	}
// 	console.log(`  Created ${checkoutSessions.length} checkout sessions\n`);

// 	// ── 22. Pending review (moderation queue) ───────────────────────────
// 	console.log("Creating pending review...");
// 	const pendingReview = {
// 		id: seedId("rev"),
// 		productId: products[5].id,
// 		authorName: "Quinn T.",
// 		authorEmail: "quinn@example.com",
// 		rating: 2,
// 		title: "Not what I expected",
// 		body: "The slip-ons looked different in the photos. Material feels cheap. Returning these.",
// 		status: "pending",
// 		isVerifiedPurchase: true,
// 		helpfulCount: 0,
// 	};
// 	await seedModuleData(reviewsModule.id, "review", [pendingReview]);
// 	console.log("  Created 1 pending review (moderation queue)\n");

// 	// ── Wishlist Items ──────────────────────────────────────────────────
// 	console.log("Creating wishlist items...");
// 	const wishlistItems = [
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_001",
// 			productId: "prod_seed_002",
// 			productName: "Merino Wool Sweater",
// 			productImage:
// 				"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600",
// 			addedAt: new Date("2024-11-15").toISOString(),
// 		},
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_001",
// 			productId: "prod_seed_005",
// 			productName: "Leather Crossbody Bag",
// 			productImage:
// 				"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
// 			note: "For birthday",
// 			addedAt: new Date("2024-12-01").toISOString(),
// 		},
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_002",
// 			productId: "prod_seed_001",
// 			productName: "Classic Cotton T-Shirt",
// 			productImage:
// 				"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
// 			addedAt: new Date("2024-12-10").toISOString(),
// 		},
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_002",
// 			productId: "prod_seed_003",
// 			productName: "Slim Fit Chinos",
// 			productImage:
// 				"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600",
// 			addedAt: new Date("2024-12-12").toISOString(),
// 		},
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_002",
// 			productId: "prod_seed_007",
// 			productName: "Canvas Sneakers",
// 			productImage:
// 				"https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600",
// 			note: "Wait for sale",
// 			addedAt: new Date("2024-12-15").toISOString(),
// 		},
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_003",
// 			productId: "prod_seed_004",
// 			productName: "Silk Scarf",
// 			productImage:
// 				"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
// 			addedAt: new Date("2025-01-05").toISOString(),
// 		},
// 		{
// 			id: seedId("wl"),
// 			customerId: "cust_seed_003",
// 			productId: "prod_seed_006",
// 			productName: "Aviator Sunglasses",
// 			productImage:
// 				"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600",
// 			addedAt: new Date("2025-01-08").toISOString(),
// 		},
// 	];
// 	await seedModuleData(wishlistModule.id, "wishlistItem", wishlistItems);
// 	console.log(`  Created ${wishlistItems.length} wishlist items\n`);

// 	// ── Tax rates & categories ───────────────────────────────────────────
// 	console.log("Creating tax rates and categories...");
// 	const taxCategories = [
// 		{
// 			id: seedId("taxcat"),
// 			name: "default",
// 			description: "Default tax category for all products",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxcat"),
// 			name: "clothing",
// 			description: "Apparel and clothing items",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxcat"),
// 			name: "food",
// 			description: "Food and grocery items",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxcat"),
// 			name: "digital",
// 			description: "Digital products and downloads",
// 			...timestamps,
// 		},
// 	];
// 	await seedModuleData(taxModule.id, "taxCategory", taxCategories);

// 	const taxRates = [
// 		{
// 			id: seedId("taxrate"),
// 			name: "US Federal (default)",
// 			country: "US",
// 			state: "*",
// 			city: "*",
// 			postalCode: "*",
// 			rate: 0,
// 			type: "percentage",
// 			categoryId: "default",
// 			enabled: true,
// 			priority: 0,
// 			compound: false,
// 			inclusive: false,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxrate"),
// 			name: "California Sales Tax",
// 			country: "US",
// 			state: "CA",
// 			city: "*",
// 			postalCode: "*",
// 			rate: 0.0725,
// 			type: "percentage",
// 			categoryId: "default",
// 			enabled: true,
// 			priority: 1,
// 			compound: false,
// 			inclusive: false,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxrate"),
// 			name: "New York Sales Tax",
// 			country: "US",
// 			state: "NY",
// 			city: "*",
// 			postalCode: "*",
// 			rate: 0.08,
// 			type: "percentage",
// 			categoryId: "default",
// 			enabled: true,
// 			priority: 1,
// 			compound: false,
// 			inclusive: false,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxrate"),
// 			name: "Texas Sales Tax",
// 			country: "US",
// 			state: "TX",
// 			city: "*",
// 			postalCode: "*",
// 			rate: 0.0625,
// 			type: "percentage",
// 			categoryId: "default",
// 			enabled: true,
// 			priority: 1,
// 			compound: false,
// 			inclusive: false,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxrate"),
// 			name: "NY Clothing Exemption",
// 			country: "US",
// 			state: "NY",
// 			city: "*",
// 			postalCode: "*",
// 			rate: 0,
// 			type: "percentage",
// 			categoryId: taxCategories[1].id,
// 			enabled: true,
// 			priority: 2,
// 			compound: false,
// 			inclusive: false,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("taxrate"),
// 			name: "UK VAT Standard",
// 			country: "GB",
// 			state: "*",
// 			city: "*",
// 			postalCode: "*",
// 			rate: 0.2,
// 			type: "percentage",
// 			categoryId: "default",
// 			enabled: true,
// 			priority: 0,
// 			compound: false,
// 			inclusive: true,
// 			...timestamps,
// 		},
// 	];
// 	await seedModuleData(taxModule.id, "taxRate", taxRates);
// 	console.log(
// 		`  Created ${taxCategories.length} tax categories, ${taxRates.length} tax rates\n`,
// 	);

// 	// ── Gift cards ───────────────────────────────────────────────────────
// 	console.log("Creating gift cards...");
// 	const giftCards = [
// 		{
// 			id: seedId("gc"),
// 			code: "GIFT-DEMO-0001",
// 			initialBalance: 5000,
// 			currentBalance: 5000,
// 			currency: "USD",
// 			status: "active",
// 			recipientEmail: "alice@example.com",
// 			customerId: "cust_seed_001",
// 			note: "Welcome gift card",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("gc"),
// 			code: "GIFT-DEMO-0002",
// 			initialBalance: 10000,
// 			currentBalance: 7500,
// 			currency: "USD",
// 			status: "active",
// 			recipientEmail: "bob@example.com",
// 			customerId: "cust_seed_002",
// 			note: "Holiday promotion",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("gc"),
// 			code: "GIFT-DEMO-0003",
// 			initialBalance: 2500,
// 			currentBalance: 0,
// 			currency: "USD",
// 			status: "depleted",
// 			recipientEmail: "carol@example.com",
// 			customerId: "cust_seed_003",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("gc"),
// 			code: "GIFT-DEMO-0004",
// 			initialBalance: 7500,
// 			currentBalance: 7500,
// 			currency: "USD",
// 			status: "active",
// 			note: "Unassigned — available for sale",
// 			...timestamps,
// 		},
// 	];
// 	await seedModuleData(giftCardsModule.id, "giftCard", giftCards);

// 	const giftCardTransactions = [
// 		{
// 			id: seedId("gctx"),
// 			giftCardId: giftCards[1].id,
// 			type: "debit",
// 			amount: 2500,
// 			balanceAfter: 7500,
// 			orderId: "ord_seed_001",
// 			note: "Order payment",
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("gctx"),
// 			giftCardId: giftCards[2].id,
// 			type: "debit",
// 			amount: 2500,
// 			balanceAfter: 0,
// 			orderId: "ord_seed_002",
// 			note: "Order payment",
// 			...timestamps,
// 		},
// 	];
// 	await seedModuleData(
// 		giftCardsModule.id,
// 		"giftCardTransaction",
// 		giftCardTransactions,
// 	);
// 	console.log(
// 		`  Created ${giftCards.length} gift cards, ${giftCardTransactions.length} transactions\n`,
// 	);

// 	// ── Collections ─────────────────────────────────────────────────────
// 	console.log("Creating collections...");
// 	const collections = [
// 		{
// 			id: seedId("col"),
// 			name: "New Arrivals",
// 			slug: "new-arrivals",
// 			description:
// 				"The latest additions to our catalog. Fresh styles and seasonal picks.",
// 			image: "https://placehold.co/1200x600/0f172a/f8fafc?text=New+Arrivals",
// 			isFeatured: true,
// 			isVisible: true,
// 			position: 0,
// 			metadata: {},
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("col"),
// 			name: "Best Sellers",
// 			slug: "best-sellers",
// 			description: "Our most popular products, loved by customers everywhere.",
// 			image: "https://placehold.co/1200x600/1e293b/f8fafc?text=Best+Sellers",
// 			isFeatured: true,
// 			isVisible: true,
// 			position: 1,
// 			metadata: {},
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("col"),
// 			name: "Summer Essentials",
// 			slug: "summer-essentials",
// 			description:
// 				"Lightweight fabrics and sun-ready accessories for warm weather.",
// 			image:
// 				"https://placehold.co/1200x600/0284c7/e0f2fe?text=Summer+Essentials",
// 			isFeatured: false,
// 			isVisible: true,
// 			position: 2,
// 			metadata: { season: "summer" },
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("col"),
// 			name: "Gift Guide",
// 			slug: "gift-guide",
// 			description: "Curated picks that make perfect gifts for any occasion.",
// 			image: "https://placehold.co/1200x600/7c3aed/ede9fe?text=Gift+Guide",
// 			isFeatured: false,
// 			isVisible: true,
// 			position: 3,
// 			metadata: {},
// 			...timestamps,
// 		},
// 	];
// 	await seedModuleData(productsModule.id, "collection", collections);

// 	const collectionProducts = [
// 		// New Arrivals: sweater, slip-ons, sunglasses
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[0].id,
// 			productId: products[6].id,
// 			position: 0,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[0].id,
// 			productId: products[5].id,
// 			position: 1,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[0].id,
// 			productId: products[7].id,
// 			position: 2,
// 			...timestamps,
// 		},
// 		// Best Sellers: t-shirt, jeans, sneakers, watch
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[1].id,
// 			productId: products[0].id,
// 			position: 0,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[1].id,
// 			productId: products[1].id,
// 			position: 1,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[1].id,
// 			productId: products[4].id,
// 			position: 2,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[1].id,
// 			productId: products[3].id,
// 			position: 3,
// 			...timestamps,
// 		},
// 		// Summer Essentials: t-shirt, slip-ons, sunglasses
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[2].id,
// 			productId: products[0].id,
// 			position: 0,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[2].id,
// 			productId: products[5].id,
// 			position: 1,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[2].id,
// 			productId: products[7].id,
// 			position: 2,
// 			...timestamps,
// 		},
// 		// Gift Guide: watch, bag, sweater
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[3].id,
// 			productId: products[3].id,
// 			position: 0,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[3].id,
// 			productId: products[2].id,
// 			position: 1,
// 			...timestamps,
// 		},
// 		{
// 			id: seedId("cp"),
// 			collectionId: collections[3].id,
// 			productId: products[6].id,
// 			position: 2,
// 			...timestamps,
// 		},
// 	];
// 	await seedModuleData(
// 		productsModule.id,
// 		"collectionProduct",
// 		collectionProducts,
// 	);
// 	console.log(
// 		`  Created ${collections.length} collections, ${collectionProducts.length} collection-product links\n`,
// 	);

// 	// ── Fulfillments ────────────────────────────────────────────────────
// 	console.log("Creating fulfillments...");
// 	const fulfillments = [
// 		// ORD-001 (completed) — fully shipped and delivered
// 		{
// 			id: seedId("ff"),
// 			orderId: orders[0].id,
// 			status: "delivered",
// 			trackingNumber: "1Z999AA10123456784",
// 			trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
// 			carrier: "ups",
// 			notes: "Left at front door",
// 			shippedAt: pastDate(12),
// 			deliveredAt: pastDate(10),
// 			createdAt: pastDate(13),
// 			updatedAt: pastDate(10),
// 		},
// 		// ORD-002 (processing) — shipped, in transit
// 		{
// 			id: seedId("ff"),
// 			orderId: orders[1].id,
// 			status: "in_transit",
// 			trackingNumber: "9400111899223100001234",
// 			trackingUrl:
// 				"https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223100001234",
// 			carrier: "usps",
// 			shippedAt: pastDate(3),
// 			createdAt: pastDate(4),
// 			updatedAt: pastDate(3),
// 		},
// 		// ORD-004 (completed) — delivered via FedEx
// 		{
// 			id: seedId("ff"),
// 			orderId: orders[3].id,
// 			status: "delivered",
// 			trackingNumber: "794644790132",
// 			trackingUrl:
// 				"https://www.fedex.com/apps/fedextrack/?tracknumbers=794644790132",
// 			carrier: "fedex",
// 			shippedAt: pastDate(27),
// 			deliveredAt: pastDate(24),
// 			createdAt: pastDate(28),
// 			updatedAt: pastDate(24),
// 		},
// 	];
// 	await seedModuleData(ordersModule.id, "fulfillment", fulfillments);

// 	const fulfillmentItems = [
// 		// ORD-001 fulfillment — 2x T-Shirt
// 		{
// 			id: seedId("ffi"),
// 			fulfillmentId: fulfillments[0].id,
// 			orderItemId: orderItems[0].id,
// 			quantity: 2,
// 		},
// 		// ORD-002 fulfillment — 1x Jeans
// 		{
// 			id: seedId("ffi"),
// 			fulfillmentId: fulfillments[1].id,
// 			orderItemId: orderItems[1].id,
// 			quantity: 1,
// 		},
// 		// ORD-004 fulfillment — 1x Sneakers
// 		{
// 			id: seedId("ffi"),
// 			fulfillmentId: fulfillments[2].id,
// 			orderItemId: orderItems[3].id,
// 			quantity: 1,
// 		},
// 	];
// 	await seedModuleData(ordersModule.id, "fulfillmentItem", fulfillmentItems);
// 	console.log(
// 		`  Created ${fulfillments.length} fulfillments, ${fulfillmentItems.length} fulfillment items\n`,
// 	);

// 	// ── Returns/RMA ─────────────────────────────────────────────────────
// 	console.log("Creating return requests...");
// 	const returnRequests = [
// 		// Return for ORD-004 sneakers — approved and refunded
// 		{
// 			id: seedId("ret"),
// 			orderId: orders[3].id,
// 			status: "completed",
// 			type: "refund",
// 			reason: "too_small",
// 			customerNotes: "Ordered size 10 but they run small, need size 11",
// 			adminNotes: "Approved — customer is a repeat buyer. Full refund issued.",
// 			refundAmount: 12999,
// 			trackingNumber: "9261290100130418624849",
// 			trackingUrl:
// 				"https://tools.usps.com/go/TrackConfirmAction?tLabels=9261290100130418624849",
// 			carrier: "usps",
// 			createdAt: pastDate(22),
// 			updatedAt: pastDate(18),
// 		},
// 		// Return for ORD-001 t-shirt — received, pending refund
// 		{
// 			id: seedId("ret"),
// 			orderId: orders[0].id,
// 			status: "received",
// 			type: "refund",
// 			reason: "changed_mind",
// 			customerNotes: "Decided on a different color",
// 			refundAmount: 2999,
// 			trackingNumber: "1Z999AA10987654321",
// 			trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10987654321",
// 			carrier: "ups",
// 			createdAt: pastDate(8),
// 			updatedAt: pastDate(5),
// 		},
// 	];
// 	await seedModuleData(ordersModule.id, "returnRequest", returnRequests);

// 	const returnItems = [
// 		{
// 			id: seedId("rti"),
// 			returnRequestId: returnRequests[0].id,
// 			orderItemId: orderItems[3].id,
// 			quantity: 1,
// 			reason: "too_small",
// 		},
// 		{
// 			id: seedId("rti"),
// 			returnRequestId: returnRequests[1].id,
// 			orderItemId: orderItems[0].id,
// 			quantity: 1,
// 			reason: "changed_mind",
// 		},
// 	];
// 	await seedModuleData(ordersModule.id, "returnItem", returnItems);
// 	console.log(
// 		`  Created ${returnRequests.length} return requests, ${returnItems.length} return items\n`,
// 	);

// 	// ── Blog posts ─────────────────────────────────────────────────────
// 	console.log("Creating blog posts...");
// 	const blogPosts = [
// 		{
// 			id: seedId("post"),
// 			title: "Welcome to Our Store",
// 			slug: "welcome-to-our-store",
// 			content: `We're thrilled to announce the launch of our online store! After months of curating the finest fashion and accessories, we're finally ready to share our collection with you.

// ## What to Expect

// Our store features a carefully selected range of clothing, accessories, and footwear — each piece chosen for its quality, style, and timeless appeal.

// ### Curated Collections

// Browse our [New Arrivals](/collections/new-arrivals) for the latest additions, or explore our [Best Sellers](/collections/best-sellers) to see what our customers love most.

// ### Hassle-Free Shopping

// We offer fast shipping, easy returns, and responsive customer support. Your satisfaction is our top priority.

// Stay tuned for more updates, style guides, and exclusive offers. Welcome aboard!`,
// 			excerpt:
// 				"We're thrilled to announce the launch of our online store. Explore our curated collections of fashion, accessories, and footwear.",
// 			coverImage: "https://placehold.co/1200x600/0f172a/f8fafc?text=Welcome",
// 			author: "Demo User",
// 			status: "published",
// 			tags: ["announcement", "launch"],
// 			category: "News",
// 			publishedAt: pastDate(30),
// 			createdAt: pastDate(30),
// 			updatedAt: pastDate(30),
// 		},
// 		{
// 			id: seedId("post"),
// 			title: "Summer Style Guide: 5 Essential Pieces",
// 			slug: "summer-style-guide-5-essential-pieces",
// 			content: `As temperatures rise, your wardrobe should evolve. Here are five essential pieces every closet needs this summer.

// ## 1. The Classic White Tee

// Nothing beats a crisp white t-shirt. Pair it with jeans, layer it under a blazer, or wear it solo — it works everywhere.

// ## 2. Lightweight Denim

// Swap heavy winter denim for a lighter wash. Our slim-fit jeans in light indigo are the perfect summer companion.

// ## 3. Statement Sunglasses

// A great pair of sunglasses pulls any outfit together. Look for UV-protective lenses in a shape that flatters your face.

// ## 4. Versatile Sneakers

// Clean, minimal sneakers go with everything from shorts to chinos. Keep them white for maximum versatility.

// ## 5. A Quality Watch

// A timepiece elevates any casual look. Our curated watch collection ranges from minimalist to sporty — find the one that matches your style.

// ---

// *Shop these essentials and more in our [Summer Collection](/collections/summer-essentials).*`,
// 			excerpt:
// 				"As temperatures rise, your wardrobe should evolve. Here are five essential pieces every closet needs this summer.",
// 			coverImage:
// 				"https://placehold.co/1200x600/1e3a5f/f8fafc?text=Summer+Style",
// 			author: "Demo User",
// 			status: "published",
// 			tags: ["style-guide", "summer", "fashion"],
// 			category: "Style",
// 			publishedAt: pastDate(14),
// 			createdAt: pastDate(14),
// 			updatedAt: pastDate(14),
// 		},
// 		{
// 			id: seedId("post"),
// 			title: "Behind the Scenes: How We Source Our Products",
// 			slug: "behind-the-scenes-how-we-source-our-products",
// 			content: `Transparency matters to us. Here's a look at how we find and select the products in our store.

// ## Quality Over Quantity

// We work directly with manufacturers who share our commitment to quality. Every material is tested, every stitch inspected.

// ## Ethical Standards

// Our suppliers adhere to fair labor practices. We visit partner facilities regularly and maintain ongoing relationships rather than chasing the lowest price.

// ## The Selection Process

// For every product that makes it to our store, we evaluate dozens. Our criteria:

// - **Material quality** — Does it feel premium? Will it last?
// - **Design integrity** — Is the design thoughtful and timeless?
// - **Value proposition** — Does the price reflect genuine quality?
// - **Customer fit** — Does it serve our customers' lifestyle?

// ## What's Next

// We're expanding our partnerships to bring you even more curated options. Expect new categories and collaborations in the coming months.

// *Have questions about our sourcing? [Contact us](/contact) — we're always happy to share.*`,
// 			excerpt:
// 				"Transparency matters to us. Here's a look at how we find and select the products in our store.",
// 			coverImage:
// 				"https://placehold.co/1200x600/2d3748/f8fafc?text=Behind+the+Scenes",
// 			author: "Demo User",
// 			status: "published",
// 			tags: ["behind-the-scenes", "sourcing", "quality"],
// 			category: "Company",
// 			publishedAt: pastDate(7),
// 			createdAt: pastDate(7),
// 			updatedAt: pastDate(7),
// 		},
// 		{
// 			id: seedId("post"),
// 			title: "Introducing Gift Cards: The Perfect Present",
// 			slug: "introducing-gift-cards",
// 			content: `Not sure what to get? Our new gift cards let your friends and family choose exactly what they want.

// ## How It Works

// 1. Pick a value ($25, $50, $100, or custom)
// 2. Add a personal message
// 3. Send it instantly via email

// Gift cards never expire and can be used on any product in our store.

// ## Perfect for Any Occasion

// Whether it's a birthday, holiday, or just-because moment, a gift card is always appreciated. Let them choose their own style.

// *[Browse gift cards](/gift-cards) and make someone's day.*`,
// 			excerpt:
// 				"Not sure what to get? Our new gift cards let your friends and family choose exactly what they want.",
// 			coverImage: "https://placehold.co/1200x600/4a1d6e/f8fafc?text=Gift+Cards",
// 			author: "Demo User",
// 			status: "published",
// 			tags: ["gift-cards", "announcement"],
// 			category: "News",
// 			publishedAt: pastDate(3),
// 			createdAt: pastDate(3),
// 			updatedAt: pastDate(3),
// 		},
// 		{
// 			id: seedId("post"),
// 			title: "Fall Preview: What's Coming Next Season",
// 			slug: "fall-preview-whats-coming-next-season",
// 			content: `We've been working on our fall collection and we can't wait to share it with you. Here's a sneak peek at what's ahead.

// ## Rich Textures

// Expect heavier knits, corduroy, and wool blends. We're leaning into textures that feel as good as they look.

// ## Earth Tones

// The color palette shifts toward warm browns, deep greens, olive, and burgundy. These tones layer beautifully and carry through the season.

// ## Layering Essentials

// From lightweight jackets to structured overshirts, our fall lineup is built for layering — because the best outfits have depth.

// *Sign up for our [newsletter](/newsletter) to be the first to know when the fall collection drops.*`,
// 			excerpt:
// 				"We've been working on our fall collection and we can't wait to share it with you. Here's a sneak peek.",
// 			coverImage:
// 				"https://placehold.co/1200x600/5c3d1e/f8fafc?text=Fall+Preview",
// 			author: "Demo User",
// 			status: "draft",
// 			tags: ["preview", "fall", "collection"],
// 			category: "Style",
// 			createdAt: pastDate(1),
// 			updatedAt: pastDate(1),
// 		},
// 	];
// 	await seedModuleData(blogModule.id, "post", blogPosts);
// 	console.log(`  Created ${blogPosts.length} blog posts\n`);

// 	// ── Analytics events ────────────────────────────────────────────────
// 	console.log("Creating analytics events...");
// 	const sessionA = "sess_demo_001";
// 	const sessionB = "sess_demo_002";
// 	const sessionC = "sess_demo_003";
// 	const analyticsEvents = [
// 		// Session A — browsed, viewed product, purchased
// 		{
// 			id: seedId("evt"),
// 			type: "pageView",
// 			sessionId: sessionA,
// 			customerId: customers[0].id,
// 			data: { path: "/", referrer: "https://google.com" },
// 			createdAt: pastDate(14),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "productView",
// 			sessionId: sessionA,
// 			customerId: customers[0].id,
// 			productId: products[0].id,
// 			data: { referrer: "homepage" },
// 			createdAt: pastDate(14),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "addToCart",
// 			sessionId: sessionA,
// 			customerId: customers[0].id,
// 			productId: products[0].id,
// 			value: 5998,
// 			data: { quantity: 2 },
// 			createdAt: pastDate(14),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "checkout",
// 			sessionId: sessionA,
// 			customerId: customers[0].id,
// 			orderId: orders[0].id,
// 			value: 7077,
// 			data: { itemCount: 2, currency: "USD" },
// 			createdAt: pastDate(14),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "purchase",
// 			sessionId: sessionA,
// 			customerId: customers[0].id,
// 			orderId: orders[0].id,
// 			value: 7077,
// 			data: { currency: "USD", items: 1 },
// 			createdAt: pastDate(14),
// 		},
// 		// Session B — browsed, viewed, added to cart but didn't purchase
// 		{
// 			id: seedId("evt"),
// 			type: "pageView",
// 			sessionId: sessionB,
// 			customerId: customers[1].id,
// 			data: { path: "/products", referrer: "direct" },
// 			createdAt: pastDate(7),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "productView",
// 			sessionId: sessionB,
// 			customerId: customers[1].id,
// 			productId: products[1].id,
// 			data: { referrer: "product-list" },
// 			createdAt: pastDate(7),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "productView",
// 			sessionId: sessionB,
// 			customerId: customers[1].id,
// 			productId: products[3].id,
// 			data: { referrer: "product-list" },
// 			createdAt: pastDate(7),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "addToCart",
// 			sessionId: sessionB,
// 			customerId: customers[1].id,
// 			productId: products[1].id,
// 			value: 8999,
// 			data: { quantity: 1 },
// 			createdAt: pastDate(7),
// 		},
// 		// Session C — search, view, purchase
// 		{
// 			id: seedId("evt"),
// 			type: "search",
// 			sessionId: sessionC,
// 			data: { query: "watch", resultCount: 1 },
// 			createdAt: pastDate(3),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "productView",
// 			sessionId: sessionC,
// 			customerId: customers[2].id,
// 			productId: products[3].id,
// 			data: { referrer: "search" },
// 			createdAt: pastDate(3),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "addToCart",
// 			sessionId: sessionC,
// 			customerId: customers[2].id,
// 			productId: products[3].id,
// 			value: 19999,
// 			data: { quantity: 1 },
// 			createdAt: pastDate(3),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "checkout",
// 			sessionId: sessionC,
// 			customerId: customers[2].id,
// 			orderId: orders[2].id,
// 			value: 20099,
// 			data: { itemCount: 1, currency: "USD" },
// 			createdAt: pastDate(2),
// 		},
// 		// Extra page views for variety
// 		{
// 			id: seedId("evt"),
// 			type: "pageView",
// 			sessionId: "sess_demo_004",
// 			data: { path: "/collections/best-sellers", referrer: "direct" },
// 			createdAt: pastDate(1),
// 		},
// 		{
// 			id: seedId("evt"),
// 			type: "pageView",
// 			sessionId: "sess_demo_005",
// 			data: { path: "/", referrer: "https://instagram.com" },
// 			createdAt: pastDate(1),
// 		},
// 	];
// 	await seedModuleData(analyticsModule.id, "event", analyticsEvents);
// 	console.log(`  Created ${analyticsEvents.length} analytics events\n`);

// 	// ── Summary ──────────────────────────────────────────────────────────
// 	console.log("=".repeat(50));
// 	console.log("Database seeding completed!\n");
// 	console.log("Summary:");
// 	console.log(`   1 user (${user.email})`);
// 	console.log(`   1 business (${business.name})`);
// 	console.log(`   1 store (${store.name})`);
// 	console.log(`   1 store member (OWNER)`);
// 	console.log(`   1 domain (${domain.name})`);
// 	console.log("   22 modules");
// 	console.log(`   ${categories.length} categories`);
// 	console.log(`   ${products.length} products`);
// 	console.log(`   ${variants.length} product variants`);
// 	console.log(
// 		`   ${collections.length} collections, ${collectionProducts.length} collection-product links`,
// 	);
// 	console.log(
// 		`   ${customers.length} customers, ${customerAddresses.length} addresses`,
// 	);
// 	console.log(`   ${orders.length} orders, ${orderItems.length} items`);
// 	console.log(
// 		`   ${fulfillments.length} fulfillments, ${fulfillmentItems.length} fulfillment items`,
// 	);
// 	console.log(
// 		`   ${returnRequests.length} return requests, ${returnItems.length} return items`,
// 	);
// 	console.log(
// 		`   ${inventoryItems.length + variantInventoryItems.length} inventory items`,
// 	);
// 	console.log(
// 		`   ${shippingZones.length} shipping zones, ${shippingRates.length} rates`,
// 	);
// 	console.log(
// 		`   ${discounts.length} discounts, ${discountCodes.length} codes`,
// 	);
// 	console.log(`   ${reviews.length + 1} reviews (1 pending moderation)`);
// 	console.log(`   ${subscribers.length} newsletter subscribers`);
// 	console.log(`   ${carts.length} carts, ${cartItems.length} cart items`);
// 	console.log(
// 		`   ${subscriptionPlans.length} subscription plans, ${subscriptions.length} subscriptions`,
// 	);
// 	console.log(
// 		`   ${downloadableFiles.length} downloadable files, ${downloadTokens.length} tokens`,
// 	);
// 	console.log(
// 		`   ${paymentMethods.length} payment methods, ${paymentIntents.length} intents`,
// 	);
// 	console.log(`   ${checkoutSessions.length} checkout sessions`);
// 	console.log(`   ${wishlistItems.length} wishlist items`);
// 	console.log(
// 		`   ${taxCategories.length} tax categories, ${taxRates.length} tax rates`,
// 	);
// 	console.log(
// 		`   ${giftCards.length} gift cards, ${giftCardTransactions.length} gift card transactions`,
// 	);
// 	console.log(`   ${blogPosts.length} blog posts`);
// 	console.log(`   ${analyticsEvents.length} analytics events`);
// 	console.log("");
// 	console.log(`   STORE_ID=${store.id}`);
// 	console.log("");
// 	console.log("Set STORE_ID in apps/store/.env to the store UUID above.");
// 	console.log("Ready for development!");
// }

// main()
// 	.then(() => {
// 		console.log("");
// 		process.exit(0);
// 	})
// 	.catch((e) => {
// 		console.error("Seeding failed:", e);
// 		process.exit(1);
// 	});
