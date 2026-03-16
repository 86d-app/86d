import type { ModuleController } from "@86d-app/core";

export interface Delivery {
	id: string;
	orderId: string;
	externalId?: string | undefined;
	status:
		| "pending"
		| "quoted"
		| "accepted"
		| "picked-up"
		| "delivered"
		| "cancelled"
		| "failed";
	pickupAddress: Record<string, unknown>;
	dropoffAddress: Record<string, unknown>;
	pickupNotes?: string | undefined;
	dropoffNotes?: string | undefined;
	estimatedPickupTime?: Date | undefined;
	estimatedDeliveryTime?: Date | undefined;
	actualPickupTime?: Date | undefined;
	actualDeliveryTime?: Date | undefined;
	fee: number;
	tip: number;
	trackingUrl?: string | undefined;
	courierName?: string | undefined;
	courierPhone?: string | undefined;
	courierVehicle?: string | undefined;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface Quote {
	id: string;
	pickupAddress: Record<string, unknown>;
	dropoffAddress: Record<string, unknown>;
	fee: number;
	estimatedMinutes: number;
	expiresAt: Date;
	status: "active" | "expired" | "used";
	createdAt: Date;
}

export interface RequestQuoteParams {
	pickupAddress: Record<string, unknown>;
	dropoffAddress: Record<string, unknown>;
}

export interface CreateDeliveryParams {
	orderId: string;
	quoteId: string;
	pickupNotes?: string | undefined;
	dropoffNotes?: string | undefined;
	tip?: number | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface DeliveryStats {
	totalDeliveries: number;
	totalPending: number;
	totalAccepted: number;
	totalPickedUp: number;
	totalDelivered: number;
	totalCancelled: number;
	totalFailed: number;
	totalFees: number;
	totalTips: number;
}

export interface UberDirectController extends ModuleController {
	requestQuote(params: RequestQuoteParams): Promise<Quote>;

	createDelivery(params: CreateDeliveryParams): Promise<Delivery | null>;

	getDelivery(id: string): Promise<Delivery | null>;

	cancelDelivery(id: string): Promise<Delivery | null>;

	updateDeliveryStatus(
		id: string,
		status: Delivery["status"],
		updates?: Partial<
			Pick<
				Delivery,
				| "externalId"
				| "trackingUrl"
				| "courierName"
				| "courierPhone"
				| "courierVehicle"
				| "actualPickupTime"
				| "actualDeliveryTime"
			>
		>,
	): Promise<Delivery | null>;

	listDeliveries(params?: {
		status?: string | undefined;
		orderId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Delivery[]>;

	getQuote(id: string): Promise<Quote | null>;

	listQuotes(params?: {
		status?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Quote[]>;

	getDeliveryStats(): Promise<DeliveryStats>;
}
