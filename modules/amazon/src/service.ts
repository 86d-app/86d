import type { ModuleController } from "@86d-app/core";

export type ListingStatus = "active" | "inactive" | "suppressed" | "incomplete";

export type FulfillmentChannel = "FBA" | "FBM";

export type ListingCondition =
	| "new"
	| "used-like-new"
	| "used-very-good"
	| "used-good"
	| "used-acceptable"
	| "refurbished";

export type AmazonOrderStatus =
	| "pending"
	| "unshipped"
	| "shipped"
	| "cancelled"
	| "returned";

export type InventorySyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface Listing {
	id: string;
	localProductId: string;
	asin?: string | undefined;
	sku: string;
	title: string;
	status: ListingStatus;
	fulfillmentChannel: FulfillmentChannel;
	price: number;
	quantity: number;
	condition: ListingCondition;
	buyBoxOwned: boolean;
	lastSyncedAt?: Date | undefined;
	error?: string | undefined;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface AmazonOrder {
	id: string;
	amazonOrderId: string;
	status: AmazonOrderStatus;
	fulfillmentChannel: FulfillmentChannel;
	items: unknown[];
	orderTotal: number;
	shippingTotal: number;
	marketplaceFee: number;
	netProceeds: number;
	buyerName?: string | undefined;
	shippingAddress: Record<string, unknown>;
	shipDate?: Date | undefined;
	trackingNumber?: string | undefined;
	carrier?: string | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface InventorySync {
	id: string;
	status: InventorySyncStatus;
	totalSkus: number;
	updatedSkus: number;
	failedSkus: number;
	error?: string | undefined;
	startedAt: Date;
	completedAt?: Date | undefined;
	createdAt: Date;
}

export interface ChannelStats {
	totalListings: number;
	active: number;
	inactive: number;
	suppressed: number;
	incomplete: number;
	fba: number;
	fbm: number;
	totalOrders: number;
	totalRevenue: number;
}

export interface InventoryHealth {
	totalSkus: number;
	lowStock: number;
	outOfStock: number;
	fbaCount: number;
	fbmCount: number;
}

export interface AmazonController extends ModuleController {
	createListing(params: {
		localProductId: string;
		asin?: string | undefined;
		sku: string;
		title: string;
		status?: ListingStatus | undefined;
		fulfillmentChannel?: FulfillmentChannel | undefined;
		price: number;
		quantity?: number | undefined;
		condition?: ListingCondition | undefined;
		buyBoxOwned?: boolean | undefined;
		error?: string | undefined;
		metadata?: Record<string, unknown> | undefined;
	}): Promise<Listing>;

	updateListing(
		id: string,
		params: {
			asin?: string | undefined;
			sku?: string | undefined;
			title?: string | undefined;
			status?: ListingStatus | undefined;
			fulfillmentChannel?: FulfillmentChannel | undefined;
			price?: number | undefined;
			quantity?: number | undefined;
			condition?: ListingCondition | undefined;
			buyBoxOwned?: boolean | undefined;
			error?: string | undefined;
			metadata?: Record<string, unknown> | undefined;
		},
	): Promise<Listing | null>;

	deleteListing(id: string): Promise<boolean>;

	getListing(id: string): Promise<Listing | null>;

	getListingByProduct(productId: string): Promise<Listing | null>;

	getListingByAsin(asin: string): Promise<Listing | null>;

	listListings(params?: {
		status?: ListingStatus | undefined;
		fulfillmentChannel?: FulfillmentChannel | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Listing[]>;

	syncInventory(): Promise<InventorySync>;

	getLastInventorySync(): Promise<InventorySync | null>;

	receiveOrder(params: {
		amazonOrderId: string;
		status?: AmazonOrderStatus | undefined;
		fulfillmentChannel?: FulfillmentChannel | undefined;
		items: unknown[];
		orderTotal: number;
		shippingTotal: number;
		marketplaceFee: number;
		netProceeds: number;
		buyerName?: string | undefined;
		shippingAddress: Record<string, unknown>;
	}): Promise<AmazonOrder>;

	getOrder(id: string): Promise<AmazonOrder | null>;

	shipOrder(
		id: string,
		trackingNumber: string,
		carrier: string,
	): Promise<AmazonOrder | null>;

	cancelOrder(id: string): Promise<AmazonOrder | null>;

	listOrders(params?: {
		status?: AmazonOrderStatus | undefined;
		fulfillmentChannel?: FulfillmentChannel | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<AmazonOrder[]>;

	getChannelStats(): Promise<ChannelStats>;

	getInventoryHealth(): Promise<InventoryHealth>;
}
