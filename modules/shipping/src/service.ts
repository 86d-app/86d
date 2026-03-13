import type { ModuleController } from "@86d-app/core";

export interface ShippingZone {
	id: string;
	name: string;
	/** ISO 3166-1 alpha-2 country codes; empty = all countries */
	countries: string[];
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface ShippingRate {
	id: string;
	zoneId: string;
	name: string;
	/** Price in cents */
	price: number;
	minOrderAmount?: number | undefined;
	maxOrderAmount?: number | undefined;
	minWeight?: number | undefined;
	maxWeight?: number | undefined;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface CalculatedRate {
	rateId: string;
	zoneName: string;
	rateName: string;
	price: number;
}

export interface ShippingMethod {
	id: string;
	name: string;
	description?: string | undefined;
	/** Minimum estimated delivery days */
	estimatedDaysMin: number;
	/** Maximum estimated delivery days */
	estimatedDaysMax: number;
	isActive: boolean;
	/** Display order (lower = first) */
	sortOrder: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ShippingCarrier {
	id: string;
	name: string;
	/** Unique code identifier, e.g. "fedex", "ups" */
	code: string;
	/** Tracking URL template with {tracking} placeholder */
	trackingUrlTemplate?: string | undefined;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export type ShipmentStatus =
	| "pending"
	| "shipped"
	| "in_transit"
	| "delivered"
	| "returned"
	| "failed";

export interface Shipment {
	id: string;
	orderId: string;
	carrierId?: string | undefined;
	methodId?: string | undefined;
	trackingNumber?: string | undefined;
	status: ShipmentStatus;
	shippedAt?: Date | undefined;
	deliveredAt?: Date | undefined;
	estimatedDelivery?: Date | undefined;
	notes?: string | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface ShippingController extends ModuleController {
	// ── Zones ────────────────────────────────────────────────────────────
	createZone(params: {
		name: string;
		countries?: string[] | undefined;
		isActive?: boolean | undefined;
	}): Promise<ShippingZone>;

	getZone(id: string): Promise<ShippingZone | null>;

	listZones(params?: {
		activeOnly?: boolean | undefined;
	}): Promise<ShippingZone[]>;

	updateZone(
		id: string,
		params: {
			name?: string | undefined;
			countries?: string[] | undefined;
			isActive?: boolean | undefined;
		},
	): Promise<ShippingZone | null>;

	deleteZone(id: string): Promise<boolean>;

	// ── Rates ────────────────────────────────────────────────────────────
	addRate(params: {
		zoneId: string;
		name: string;
		price: number;
		minOrderAmount?: number | undefined;
		maxOrderAmount?: number | undefined;
		minWeight?: number | undefined;
		maxWeight?: number | undefined;
		isActive?: boolean | undefined;
	}): Promise<ShippingRate>;

	getRate(id: string): Promise<ShippingRate | null>;

	listRates(params: {
		zoneId: string;
		activeOnly?: boolean | undefined;
	}): Promise<ShippingRate[]>;

	updateRate(
		id: string,
		params: {
			name?: string | undefined;
			price?: number | undefined;
			minOrderAmount?: number | undefined;
			maxOrderAmount?: number | undefined;
			minWeight?: number | undefined;
			maxWeight?: number | undefined;
			isActive?: boolean | undefined;
		},
	): Promise<ShippingRate | null>;

	deleteRate(id: string): Promise<boolean>;

	calculateRates(params: {
		country: string;
		orderAmount: number;
		weight?: number | undefined;
	}): Promise<CalculatedRate[]>;

	// ── Methods ──────────────────────────────────────────────────────────
	createMethod(params: {
		name: string;
		description?: string | undefined;
		estimatedDaysMin: number;
		estimatedDaysMax: number;
		isActive?: boolean | undefined;
		sortOrder?: number | undefined;
	}): Promise<ShippingMethod>;

	getMethod(id: string): Promise<ShippingMethod | null>;

	listMethods(params?: {
		activeOnly?: boolean | undefined;
	}): Promise<ShippingMethod[]>;

	updateMethod(
		id: string,
		params: {
			name?: string | undefined;
			description?: string | undefined;
			estimatedDaysMin?: number | undefined;
			estimatedDaysMax?: number | undefined;
			isActive?: boolean | undefined;
			sortOrder?: number | undefined;
		},
	): Promise<ShippingMethod | null>;

	deleteMethod(id: string): Promise<boolean>;

	// ── Carriers ─────────────────────────────────────────────────────────
	createCarrier(params: {
		name: string;
		code: string;
		trackingUrlTemplate?: string | undefined;
		isActive?: boolean | undefined;
	}): Promise<ShippingCarrier>;

	getCarrier(id: string): Promise<ShippingCarrier | null>;

	listCarriers(params?: {
		activeOnly?: boolean | undefined;
	}): Promise<ShippingCarrier[]>;

	updateCarrier(
		id: string,
		params: {
			name?: string | undefined;
			code?: string | undefined;
			trackingUrlTemplate?: string | undefined;
			isActive?: boolean | undefined;
		},
	): Promise<ShippingCarrier | null>;

	deleteCarrier(id: string): Promise<boolean>;

	// ── Shipments ────────────────────────────────────────────────────────
	createShipment(params: {
		orderId: string;
		carrierId?: string | undefined;
		methodId?: string | undefined;
		trackingNumber?: string | undefined;
		estimatedDelivery?: Date | undefined;
		notes?: string | undefined;
	}): Promise<Shipment>;

	getShipment(id: string): Promise<Shipment | null>;

	listShipments(params?: {
		orderId?: string | undefined;
		status?: ShipmentStatus | undefined;
	}): Promise<Shipment[]>;

	updateShipment(
		id: string,
		params: {
			carrierId?: string | undefined;
			methodId?: string | undefined;
			trackingNumber?: string | undefined;
			estimatedDelivery?: Date | undefined;
			notes?: string | undefined;
		},
	): Promise<Shipment | null>;

	updateShipmentStatus(
		id: string,
		status: ShipmentStatus,
	): Promise<Shipment | null>;

	deleteShipment(id: string): Promise<boolean>;

	getTrackingUrl(shipmentId: string): Promise<string | null>;
}
