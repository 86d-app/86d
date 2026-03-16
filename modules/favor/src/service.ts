import type { ModuleController } from "@86d-app/core";

export interface FavorDelivery {
	id: string;
	orderId: string;
	externalId?: string | undefined;
	status:
		| "pending"
		| "assigned"
		| "en-route"
		| "arrived"
		| "completed"
		| "cancelled";
	pickupAddress: Record<string, unknown>;
	dropoffAddress: Record<string, unknown>;
	estimatedArrival?: Date | undefined;
	actualArrival?: Date | undefined;
	fee: number;
	tip: number;
	runnerName?: string | undefined;
	runnerPhone?: string | undefined;
	trackingUrl?: string | undefined;
	specialInstructions?: string | undefined;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface ServiceArea {
	id: string;
	name: string;
	isActive: boolean;
	zipCodes: string[];
	minOrderAmount: number;
	deliveryFee: number;
	estimatedMinutes: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateFavorDeliveryParams {
	orderId: string;
	pickupAddress: Record<string, unknown>;
	dropoffAddress: Record<string, unknown>;
	fee: number;
	tip?: number | undefined;
	specialInstructions?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface CreateServiceAreaParams {
	name: string;
	zipCodes: string[];
	minOrderAmount?: number | undefined;
	deliveryFee: number;
	estimatedMinutes: number;
}

export interface UpdateServiceAreaParams {
	name?: string | undefined;
	isActive?: boolean | undefined;
	zipCodes?: string[] | undefined;
	minOrderAmount?: number | undefined;
	deliveryFee?: number | undefined;
	estimatedMinutes?: number | undefined;
}

export interface FavorDeliveryStats {
	totalDeliveries: number;
	totalPending: number;
	totalAssigned: number;
	totalEnRoute: number;
	totalCompleted: number;
	totalCancelled: number;
	totalFees: number;
	totalTips: number;
}

export interface FavorController extends ModuleController {
	createDelivery(params: CreateFavorDeliveryParams): Promise<FavorDelivery>;

	getDelivery(id: string): Promise<FavorDelivery | null>;

	cancelDelivery(id: string): Promise<FavorDelivery | null>;

	updateDeliveryStatus(
		id: string,
		status: FavorDelivery["status"],
		updates?: Partial<
			Pick<
				FavorDelivery,
				| "externalId"
				| "runnerName"
				| "runnerPhone"
				| "trackingUrl"
				| "estimatedArrival"
				| "actualArrival"
			>
		>,
	): Promise<FavorDelivery | null>;

	listDeliveries(params?: {
		status?: string | undefined;
		orderId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<FavorDelivery[]>;

	createServiceArea(params: CreateServiceAreaParams): Promise<ServiceArea>;

	updateServiceArea(
		id: string,
		params: UpdateServiceAreaParams,
	): Promise<ServiceArea | null>;

	deleteServiceArea(id: string): Promise<boolean>;

	listServiceAreas(params?: {
		isActive?: boolean | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<ServiceArea[]>;

	checkAvailability(
		zipCode: string,
	): Promise<{ available: boolean; area: ServiceArea | null }>;

	getDeliveryStats(): Promise<FavorDeliveryStats>;
}
