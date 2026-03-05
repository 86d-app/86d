import type { ModuleDataService } from "@86d-app/core";
import type {
	CalculatedRate,
	ShippingController,
	ShippingRate,
	ShippingZone,
} from "./service";

export function createShippingController(
	data: ModuleDataService,
): ShippingController {
	return {
		// ── Zones ────────────────────────────────────────────────────────────

		async createZone(params): Promise<ShippingZone> {
			const id = crypto.randomUUID();
			const now = new Date();
			const zone: ShippingZone = {
				id,
				name: params.name,
				countries: params.countries ?? [],
				isActive: params.isActive ?? true,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("shippingZone", id, zone as Record<string, any>);
			return zone;
		},

		async getZone(id): Promise<ShippingZone | null> {
			return (await data.get("shippingZone", id)) as ShippingZone | null;
		},

		async listZones(params): Promise<ShippingZone[]> {
			if (params?.activeOnly) {
				return (await data.findMany("shippingZone", {
					where: { isActive: true },
				})) as ShippingZone[];
			}
			return (await data.findMany("shippingZone", {})) as ShippingZone[];
		},

		async updateZone(id, params): Promise<ShippingZone | null> {
			const existing = (await data.get(
				"shippingZone",
				id,
			)) as ShippingZone | null;
			if (!existing) return null;

			const updated: ShippingZone = {
				...existing,
				...(params.name !== undefined ? { name: params.name } : {}),
				...(params.countries !== undefined
					? { countries: params.countries }
					: {}),
				...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("shippingZone", id, updated as Record<string, any>);
			return updated;
		},

		async deleteZone(id): Promise<boolean> {
			const existing = (await data.get(
				"shippingZone",
				id,
			)) as ShippingZone | null;
			if (!existing) return false;

			// Remove all rates for this zone
			const rates = (await data.findMany("shippingRate", {
				where: { zoneId: id },
			})) as ShippingRate[];
			for (const rate of rates) {
				await data.delete("shippingRate", rate.id);
			}

			await data.delete("shippingZone", id);
			return true;
		},

		// ── Rates ────────────────────────────────────────────────────────────

		async addRate(params): Promise<ShippingRate> {
			const id = crypto.randomUUID();
			const now = new Date();
			const rate: ShippingRate = {
				id,
				zoneId: params.zoneId,
				name: params.name,
				price: params.price,
				minOrderAmount: params.minOrderAmount,
				maxOrderAmount: params.maxOrderAmount,
				minWeight: params.minWeight,
				maxWeight: params.maxWeight,
				isActive: params.isActive ?? true,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("shippingRate", id, rate as Record<string, any>);
			return rate;
		},

		async getRate(id): Promise<ShippingRate | null> {
			return (await data.get("shippingRate", id)) as ShippingRate | null;
		},

		async listRates(params): Promise<ShippingRate[]> {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = { zoneId: params.zoneId };
			if (params.activeOnly) where.isActive = true;

			return (await data.findMany("shippingRate", {
				where,
			})) as ShippingRate[];
		},

		async updateRate(id, params): Promise<ShippingRate | null> {
			const existing = (await data.get(
				"shippingRate",
				id,
			)) as ShippingRate | null;
			if (!existing) return null;

			const updated: ShippingRate = {
				...existing,
				...(params.name !== undefined ? { name: params.name } : {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.minOrderAmount !== undefined
					? { minOrderAmount: params.minOrderAmount }
					: {}),
				...(params.maxOrderAmount !== undefined
					? { maxOrderAmount: params.maxOrderAmount }
					: {}),
				...(params.minWeight !== undefined
					? { minWeight: params.minWeight }
					: {}),
				...(params.maxWeight !== undefined
					? { maxWeight: params.maxWeight }
					: {}),
				...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("shippingRate", id, updated as Record<string, any>);
			return updated;
		},

		async deleteRate(id): Promise<boolean> {
			const existing = (await data.get(
				"shippingRate",
				id,
			)) as ShippingRate | null;
			if (!existing) return false;
			await data.delete("shippingRate", id);
			return true;
		},

		async calculateRates(params): Promise<CalculatedRate[]> {
			// Find zones that include this country (or wildcard zones)
			const zones = (await data.findMany("shippingZone", {
				where: { isActive: true },
			})) as ShippingZone[];

			const matchingZones = zones.filter(
				(z) =>
					z.countries.length === 0 ||
					z.countries.includes(params.country.toUpperCase()),
			);

			const results: CalculatedRate[] = [];

			for (const zone of matchingZones) {
				const rates = (await data.findMany("shippingRate", {
					where: { zoneId: zone.id, isActive: true },
				})) as ShippingRate[];

				for (const rate of rates) {
					// Check amount conditions
					if (
						rate.minOrderAmount !== undefined &&
						rate.minOrderAmount !== null &&
						params.orderAmount < rate.minOrderAmount
					)
						continue;
					if (
						rate.maxOrderAmount !== undefined &&
						rate.maxOrderAmount !== null &&
						params.orderAmount > rate.maxOrderAmount
					)
						continue;

					// Check weight conditions
					if (params.weight !== undefined) {
						if (
							rate.minWeight !== undefined &&
							rate.minWeight !== null &&
							params.weight < rate.minWeight
						)
							continue;
						if (
							rate.maxWeight !== undefined &&
							rate.maxWeight !== null &&
							params.weight > rate.maxWeight
						)
							continue;
					}

					results.push({
						rateId: rate.id,
						zoneName: zone.name,
						rateName: rate.name,
						price: rate.price,
					});
				}
			}

			// Sort cheapest first
			return results.sort((a, b) => a.price - b.price);
		},
	};
}
