import type { ModuleController } from "@86d-app/core";

// ── Enums ──────────────────────────────────────────────────────────

export type RegistryType =
	| "wedding"
	| "baby"
	| "birthday"
	| "housewarming"
	| "holiday"
	| "other";

export type RegistryVisibility = "public" | "unlisted" | "private";

export type RegistryStatus = "active" | "completed" | "archived";

export type ItemPriority = "must_have" | "nice_to_have" | "dream";

// ── Entities ───────────────────────────────────────────────────────

export interface Registry {
	id: string;
	customerId: string;
	customerName: string;
	title: string;
	description?: string;
	type: RegistryType;
	slug: string;
	visibility: RegistryVisibility;
	status: RegistryStatus;
	eventDate?: Date;
	coverImageUrl?: string;
	shippingAddressId?: string;
	thankYouMessage?: string;
	itemCount: number;
	purchasedCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface RegistryItem {
	id: string;
	registryId: string;
	productId: string;
	productName: string;
	variantId?: string;
	variantName?: string;
	imageUrl?: string;
	priceInCents: number;
	quantityDesired: number;
	quantityReceived: number;
	priority: ItemPriority;
	note?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface RegistryPurchase {
	id: string;
	registryId: string;
	registryItemId: string;
	purchaserId?: string;
	purchaserName: string;
	quantity: number;
	amountInCents: number;
	orderId?: string;
	giftMessage?: string;
	isAnonymous: boolean;
	createdAt: Date;
}

// ── Input params ───────────────────────────────────────────────────

export interface CreateRegistryParams {
	customerId: string;
	customerName: string;
	title: string;
	description?: string;
	type: RegistryType;
	slug?: string;
	visibility?: RegistryVisibility;
	eventDate?: Date;
	coverImageUrl?: string;
	shippingAddressId?: string;
	thankYouMessage?: string;
}

export interface UpdateRegistryParams {
	title?: string;
	description?: string;
	type?: RegistryType;
	visibility?: RegistryVisibility;
	eventDate?: Date;
	coverImageUrl?: string;
	shippingAddressId?: string;
	thankYouMessage?: string;
}

export interface AddItemParams {
	registryId: string;
	productId: string;
	productName: string;
	variantId?: string;
	variantName?: string;
	imageUrl?: string;
	priceInCents: number;
	quantityDesired?: number;
	priority?: ItemPriority;
	note?: string;
}

export interface UpdateItemParams {
	quantityDesired?: number;
	priority?: ItemPriority;
	note?: string;
}

export interface PurchaseItemParams {
	registryId: string;
	registryItemId: string;
	purchaserId?: string;
	purchaserName: string;
	quantity: number;
	amountInCents: number;
	orderId?: string;
	giftMessage?: string;
	isAnonymous?: boolean;
}

export interface ListRegistriesParams {
	customerId?: string;
	type?: RegistryType;
	status?: RegistryStatus;
	visibility?: RegistryVisibility;
	take?: number;
	skip?: number;
}

// ── Results ────────────────────────────────────────────────────────

export interface RegistrySummary {
	totalRegistries: number;
	active: number;
	completed: number;
	archived: number;
	totalItems: number;
	totalPurchased: number;
	totalRevenue: number;
}

// ── Controller ─────────────────────────────────────────────────────

export interface GiftRegistryController extends ModuleController {
	// Registry CRUD
	createRegistry(params: CreateRegistryParams): Promise<Registry>;
	updateRegistry(
		id: string,
		params: UpdateRegistryParams,
	): Promise<Registry | null>;
	getRegistry(id: string): Promise<Registry | null>;
	getRegistryBySlug(slug: string): Promise<Registry | null>;
	listRegistries(params?: ListRegistriesParams): Promise<Registry[]>;
	deleteRegistry(id: string): Promise<boolean>;
	archiveRegistry(id: string): Promise<Registry | null>;

	// Registry items
	addItem(params: AddItemParams): Promise<RegistryItem>;
	updateItem(
		id: string,
		params: UpdateItemParams,
	): Promise<RegistryItem | null>;
	removeItem(id: string): Promise<boolean>;
	listItems(
		registryId: string,
		params?: { take?: number; skip?: number },
	): Promise<RegistryItem[]>;
	getItem(id: string): Promise<RegistryItem | null>;

	// Purchases
	purchaseItem(params: PurchaseItemParams): Promise<RegistryPurchase>;
	listPurchases(
		registryId: string,
		params?: { take?: number; skip?: number },
	): Promise<RegistryPurchase[]>;
	getPurchasesByItem(registryItemId: string): Promise<RegistryPurchase[]>;

	// Customer queries
	getCustomerRegistries(customerId: string): Promise<Registry[]>;

	// Analytics
	getRegistrySummary(): Promise<RegistrySummary>;
}
