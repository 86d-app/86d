import type { ModuleDataService, ScopedEventEmitter } from "@86d-app/core";
import type {
	Fulfillment,
	FulfillmentController,
	FulfillmentStatus,
} from "./service";

const STATUS_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
	pending: ["processing", "shipped", "cancelled"],
	processing: ["shipped", "cancelled"],
	shipped: ["delivered", "cancelled"],
	delivered: [],
	cancelled: [],
};

export interface FulfillmentControllerOptions {
	/** Auto-transition to "shipped" when tracking is added to a pending/processing fulfillment */
	autoShipOnTracking?: boolean | undefined;
}

export function createFulfillmentController(
	data: ModuleDataService,
	events?: ScopedEventEmitter | undefined,
	options?: FulfillmentControllerOptions | undefined,
): FulfillmentController {
	return {
		async createFulfillment(params): Promise<Fulfillment> {
			if (params.items.length === 0) {
				throw new Error("Fulfillment must contain at least one item");
			}

			const id = crypto.randomUUID();
			const now = new Date();
			const fulfillment: Fulfillment = {
				id,
				orderId: params.orderId,
				status: "pending",
				items: params.items,
				notes: params.notes,
				createdAt: now,
				updatedAt: now,
			};
			await data.upsert(
				"fulfillment",
				id,
				fulfillment as Record<string, unknown>,
			);

			if (events) {
				void events.emit("fulfillment.created", {
					fulfillmentId: id,
					orderId: params.orderId,
					items: params.items,
				});
			}

			return fulfillment;
		},

		async getFulfillment(id): Promise<Fulfillment | null> {
			return (await data.get("fulfillment", id)) as Fulfillment | null;
		},

		async listByOrder(orderId): Promise<Fulfillment[]> {
			return (await data.findMany("fulfillment", {
				where: { orderId },
			})) as Fulfillment[];
		},

		async listFulfillments(params): Promise<Fulfillment[]> {
			const where: Record<string, unknown> = {};
			if (params?.status) where.status = params.status;

			const results = (await data.findMany("fulfillment", {
				where,
			})) as Fulfillment[];

			const offset = params?.offset ?? 0;
			const limit = params?.limit ?? results.length;
			return results.slice(offset, offset + limit);
		},

		async updateStatus(id, status): Promise<Fulfillment | null> {
			const existing = (await data.get(
				"fulfillment",
				id,
			)) as Fulfillment | null;
			if (!existing) return null;

			const allowed = STATUS_TRANSITIONS[existing.status];
			if (!allowed?.includes(status)) {
				throw new Error(
					`Cannot transition from "${existing.status}" to "${status}"`,
				);
			}

			const now = new Date();
			const updated: Fulfillment = {
				...existing,
				status,
				updatedAt: now,
				...(status === "shipped" ? { shippedAt: now } : {}),
				...(status === "delivered" ? { deliveredAt: now } : {}),
			};
			await data.upsert("fulfillment", id, updated as Record<string, unknown>);

			if (events) {
				if (status === "shipped") {
					void events.emit("fulfillment.shipped", {
						fulfillmentId: id,
						orderId: existing.orderId,
						carrier: updated.carrier,
						trackingNumber: updated.trackingNumber,
					});
				} else if (status === "delivered") {
					void events.emit("fulfillment.delivered", {
						fulfillmentId: id,
						orderId: existing.orderId,
					});
				} else if (status === "cancelled") {
					void events.emit("fulfillment.cancelled", {
						fulfillmentId: id,
						orderId: existing.orderId,
					});
				}
			}

			return updated;
		},

		async addTracking(id, params): Promise<Fulfillment | null> {
			const existing = (await data.get(
				"fulfillment",
				id,
			)) as Fulfillment | null;
			if (!existing) return null;

			if (existing.status === "delivered" || existing.status === "cancelled") {
				throw new Error(
					`Cannot add tracking to a ${existing.status} fulfillment`,
				);
			}

			const now = new Date();
			const shouldAutoShip =
				options?.autoShipOnTracking &&
				(existing.status === "pending" || existing.status === "processing");

			const updated: Fulfillment = {
				...existing,
				carrier: params.carrier,
				trackingNumber: params.trackingNumber,
				trackingUrl: params.trackingUrl,
				updatedAt: now,
				...(shouldAutoShip
					? { status: "shipped" as const, shippedAt: now }
					: {}),
			};
			await data.upsert("fulfillment", id, updated as Record<string, unknown>);

			if (events && shouldAutoShip) {
				void events.emit("fulfillment.shipped", {
					fulfillmentId: id,
					orderId: existing.orderId,
					carrier: params.carrier,
					trackingNumber: params.trackingNumber,
				});
			}

			return updated;
		},

		async cancelFulfillment(id): Promise<Fulfillment | null> {
			const existing = (await data.get(
				"fulfillment",
				id,
			)) as Fulfillment | null;
			if (!existing) return null;

			if (existing.status === "delivered") {
				throw new Error("Cannot cancel a delivered fulfillment");
			}
			if (existing.status === "cancelled") {
				return existing;
			}

			const updated: Fulfillment = {
				...existing,
				status: "cancelled",
				updatedAt: new Date(),
			};
			await data.upsert("fulfillment", id, updated as Record<string, unknown>);

			if (events) {
				void events.emit("fulfillment.cancelled", {
					fulfillmentId: id,
					orderId: existing.orderId,
				});
			}

			return updated;
		},
	};
}
