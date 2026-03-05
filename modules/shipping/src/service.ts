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

	/**
	 * Return all rates applicable to a given destination + order context.
	 * Zones are matched by country (empty countries list = wildcard).
	 * Rates are filtered by amount/weight conditions.
	 */
	calculateRates(params: {
		country: string;
		orderAmount: number;
		weight?: number | undefined;
	}): Promise<CalculatedRate[]>;
}
