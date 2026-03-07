import type { ModuleDataService } from "@86d-app/core";
import type {
	Fulfillment,
	FulfillmentController,
	FulfillmentStatus,
} from "./service";

const VALID_STATUSES: FulfillmentStatus[] = [
	"pending",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
];

const STATUS_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
	pending: ["processing", "shipped", "cancelled"],
	processing: ["shipped", "cancelled"],
	shipped: ["delivered", "cancelled"],
	delivered: [],
	cancelled: [],
};

export function createFulfillmentController(
	data: ModuleDataService,
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
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("fulfillment", id, fulfillment as Record<string, any>);
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
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
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

			if (!VALID_STATUSES.includes(status)) {
				throw new Error(`Invalid status: ${status}`);
			}

			const allowed = STATUS_TRANSITIONS[existing.status];
			if (!allowed.includes(status)) {
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
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("fulfillment", id, updated as Record<string, any>);
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

			const updated: Fulfillment = {
				...existing,
				carrier: params.carrier,
				trackingNumber: params.trackingNumber,
				trackingUrl: params.trackingUrl,
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("fulfillment", id, updated as Record<string, any>);
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
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("fulfillment", id, updated as Record<string, any>);
			return updated;
		},
	};
}
