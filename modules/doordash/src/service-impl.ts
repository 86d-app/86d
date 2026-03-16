import type { ModuleDataService, ScopedEventEmitter } from "@86d-app/core";
import type {
	Delivery,
	DeliveryAvailability,
	DeliveryZone,
	DoordashController,
} from "./service";

function haversineDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 3959; // Earth radius in miles
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export function createDoordashController(
	data: ModuleDataService,
	events?: ScopedEventEmitter | undefined,
): DoordashController {
	return {
		async createDelivery(params) {
			const now = new Date();
			const id = crypto.randomUUID();
			const delivery: Delivery = {
				id,
				orderId: params.orderId,
				status: "pending",
				pickupAddress: params.pickupAddress,
				dropoffAddress: params.dropoffAddress,
				fee: params.fee,
				tip: params.tip ?? 0,
				metadata: params.metadata ?? {},
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("delivery", id, delivery as Record<string, any>);
			void events?.emit("doordash.delivery.created", {
				deliveryId: delivery.id,
				orderId: delivery.orderId,
			});
			return delivery;
		},

		async getDelivery(id) {
			const raw = await data.get("delivery", id);
			if (!raw) return null;
			return raw as unknown as Delivery;
		},

		async cancelDelivery(id) {
			const existing = await data.get("delivery", id);
			if (!existing) return null;

			const delivery = existing as unknown as Delivery;
			if (delivery.status === "delivered" || delivery.status === "cancelled") {
				return null;
			}

			const now = new Date();
			const updated: Delivery = {
				...delivery,
				status: "cancelled",
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("delivery", id, updated as Record<string, any>);
			void events?.emit("doordash.delivery.cancelled", {
				deliveryId: updated.id,
				orderId: updated.orderId,
			});
			return updated;
		},

		async updateDeliveryStatus(id, status) {
			const existing = await data.get("delivery", id);
			if (!existing) return null;

			const delivery = existing as unknown as Delivery;
			if (delivery.status === "delivered" || delivery.status === "cancelled") {
				return null;
			}

			const now = new Date();
			const updated: Delivery = {
				...delivery,
				status,
				...(status === "picked-up" ? { actualPickupTime: now } : {}),
				...(status === "delivered" ? { actualDeliveryTime: now } : {}),
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("delivery", id, updated as Record<string, any>);

			if (status === "picked-up") {
				void events?.emit("doordash.delivery.picked-up", {
					deliveryId: updated.id,
					orderId: updated.orderId,
				});
			} else if (status === "delivered") {
				void events?.emit("doordash.delivery.delivered", {
					deliveryId: updated.id,
					orderId: updated.orderId,
				});
			}
			return updated;
		},

		async listDeliveries(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("delivery", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as Delivery[];
		},

		async createZone(params) {
			const now = new Date();
			const id = crypto.randomUUID();
			const zone: DeliveryZone = {
				id,
				name: params.name,
				isActive: true,
				radius: params.radius,
				centerLat: params.centerLat,
				centerLng: params.centerLng,
				minOrderAmount: params.minOrderAmount ?? 0,
				deliveryFee: params.deliveryFee,
				estimatedMinutes: params.estimatedMinutes,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("deliveryZone", id, zone as Record<string, any>);
			return zone;
		},

		async updateZone(id, params) {
			const existing = await data.get("deliveryZone", id);
			if (!existing) return null;

			const zone = existing as unknown as DeliveryZone;
			const updated: DeliveryZone = {
				...zone,
				...(params.name !== undefined ? { name: params.name } : {}),
				...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
				...(params.radius !== undefined ? { radius: params.radius } : {}),
				...(params.centerLat !== undefined
					? { centerLat: params.centerLat }
					: {}),
				...(params.centerLng !== undefined
					? { centerLng: params.centerLng }
					: {}),
				...(params.minOrderAmount !== undefined
					? { minOrderAmount: params.minOrderAmount }
					: {}),
				...(params.deliveryFee !== undefined
					? { deliveryFee: params.deliveryFee }
					: {}),
				...(params.estimatedMinutes !== undefined
					? { estimatedMinutes: params.estimatedMinutes }
					: {}),
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("deliveryZone", id, updated as Record<string, any>);
			return updated;
		},

		async deleteZone(id) {
			const existing = await data.get("deliveryZone", id);
			if (!existing) return false;
			await data.delete("deliveryZone", id);
			return true;
		},

		async listZones(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.isActive !== undefined) where.isActive = params.isActive;

			const all = await data.findMany("deliveryZone", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as DeliveryZone[];
		},

		async checkDeliveryAvailability(address) {
			const zones = await data.findMany("deliveryZone", {
				where: { isActive: true },
			});
			const activeZones = zones as unknown as DeliveryZone[];

			for (const zone of activeZones) {
				const distance = haversineDistance(
					zone.centerLat,
					zone.centerLng,
					address.lat,
					address.lng,
				);
				if (distance <= zone.radius) {
					const result: DeliveryAvailability = {
						available: true,
						zone,
						estimatedMinutes: zone.estimatedMinutes,
						deliveryFee: zone.deliveryFee,
					};
					return result;
				}
			}

			return { available: false };
		},
	};
}
