import type { ModuleController } from "@86d-app/core";

export type FulfillmentStatus =
	| "pending"
	| "processing"
	| "shipped"
	| "delivered"
	| "cancelled";

export interface FulfillmentItem {
	lineItemId: string;
	quantity: number;
}

export interface Fulfillment {
	id: string;
	orderId: string;
	status: FulfillmentStatus;
	items: FulfillmentItem[];
	carrier?: string | undefined;
	trackingNumber?: string | undefined;
	trackingUrl?: string | undefined;
	notes?: string | undefined;
	shippedAt?: Date | undefined;
	deliveredAt?: Date | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface FulfillmentController extends ModuleController {
	createFulfillment(params: {
		orderId: string;
		items: FulfillmentItem[];
		notes?: string | undefined;
	}): Promise<Fulfillment>;

	getFulfillment(id: string): Promise<Fulfillment | null>;

	listByOrder(orderId: string): Promise<Fulfillment[]>;

	listFulfillments(params?: {
		status?: FulfillmentStatus | undefined;
		limit?: number | undefined;
		offset?: number | undefined;
	}): Promise<Fulfillment[]>;

	updateStatus(
		id: string,
		status: FulfillmentStatus,
	): Promise<Fulfillment | null>;

	addTracking(
		id: string,
		params: {
			carrier: string;
			trackingNumber: string;
			trackingUrl?: string | undefined;
		},
	): Promise<Fulfillment | null>;

	cancelFulfillment(id: string): Promise<Fulfillment | null>;
}
