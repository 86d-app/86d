import type { ModuleRegistry } from "@86d-app/runtime/registry";
import { db } from "db";
import { logger } from "utils/logger";

const BACKFILL_MARKER = "legacy_orders_fulfillment_backfill_v1";

interface LegacyFulfillmentRow {
	readonly id: string;
	readonly orderId?: string;
	readonly status?: string;
	readonly trackingNumber?: string | null;
	readonly trackingUrl?: string | null;
	readonly carrier?: string | null;
	readonly notes?: string | null;
	readonly shippedAt?: string | Date | null;
	readonly deliveredAt?: string | Date | null;
	readonly createdAt?: string | Date;
	readonly updatedAt?: string | Date;
}

interface LegacyFulfillmentItemRow {
	readonly id: string;
	readonly fulfillmentId?: string;
	readonly orderItemId?: string;
	readonly quantity?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRowData<T>(row: { data: unknown }): T | null {
	if (!isRecord(row.data)) return null;
	return row.data as T;
}

/**
 * One-time migration from legacy Orders-owned fulfillment rows into the
 * Fulfillment module owner. Safe to call on every boot; exits immediately
 * once the store marker is present or no legacy rows exist.
 */
export async function backfillLegacyOrderFulfillments(
	registry: ModuleRegistry,
): Promise<void> {
	if (!registry.isReady()) return;

	const fulfillmentContext = registry.createRequestContext("fulfillment");
	const fulfillmentController = fulfillmentContext.controllers.fulfillment as
		| {
				listByOrder?: (orderId: string) => Promise<unknown[]>;
				createFulfillment?: (input: {
					orderId: string;
					items: Array<{ lineItemId: string; quantity: number }>;
					notes?: string;
				}) => Promise<{ id: string }>;
				updateStatus?: (
					id: string,
					status: string,
				) => Promise<unknown>;
				addTracking?: (
					id: string,
					params: {
						carrier: string;
						trackingNumber: string;
						trackingUrl?: string;
					},
				) => Promise<unknown>;
		  }
		| undefined;
	if (!fulfillmentController?.createFulfillment) return;

	const storeModule = await db.module.findFirst({
		where: { name: "fulfillment" },
		select: { id: true, settings: true },
	});
	if (!storeModule) return;

	const settings =
		storeModule.settings && typeof storeModule.settings === "object"
			? (storeModule.settings as Record<string, unknown>)
			: {};
	if (settings[BACKFILL_MARKER] === true) return;

	const ordersModule = await db.module.findFirst({
		where: { name: "orders" },
		select: { id: true },
	});
	if (!ordersModule) {
		await markBackfillComplete(storeModule.id, settings);
		return;
	}

	const legacyFulfillments = await db.moduleData.findMany({
		where: {
			moduleId: ordersModule.id,
			entityType: "fulfillment",
		},
	});
	if (legacyFulfillments.length === 0) {
		await markBackfillComplete(storeModule.id, settings);
		return;
	}

	const legacyItems = await db.moduleData.findMany({
		where: {
			moduleId: ordersModule.id,
			entityType: "fulfillmentItem",
		},
	});
	const itemsByFulfillment = new Map<string, LegacyFulfillmentItemRow[]>();
	for (const row of legacyItems) {
		const item = readRowData<LegacyFulfillmentItemRow>(row);
		if (!item?.fulfillmentId || !item.orderItemId || !item.quantity) continue;
		const bucket = itemsByFulfillment.get(item.fulfillmentId) ?? [];
		bucket.push(item);
		itemsByFulfillment.set(item.fulfillmentId, bucket);
	}

	let migrated = 0;
	for (const row of legacyFulfillments) {
		const legacy = readRowData<LegacyFulfillmentRow>(row);
		if (!legacy?.orderId) continue;

		const existing = fulfillmentController.listByOrder
			? await fulfillmentController.listByOrder(legacy.orderId)
			: [];
		if (existing.length > 0) continue;

		const items = (itemsByFulfillment.get(legacy.id) ?? [])
			.filter((item) => item.orderItemId && item.quantity)
			.map((item) => ({
				lineItemId: item.orderItemId!,
				quantity: item.quantity!,
			}));
		if (items.length === 0) continue;

		const created = await fulfillmentController.createFulfillment({
			orderId: legacy.orderId,
			items,
			...(legacy.notes ? { notes: legacy.notes } : {}),
		});

		if (
			legacy.carrier &&
			legacy.trackingNumber &&
			fulfillmentController.addTracking
		) {
			await fulfillmentController.addTracking(created.id, {
				carrier: legacy.carrier,
				trackingNumber: legacy.trackingNumber,
				...(legacy.trackingUrl ? { trackingUrl: legacy.trackingUrl } : {}),
			});
		}

		if (
			legacy.status &&
			legacy.status !== "pending" &&
			fulfillmentController.updateStatus
		) {
			await fulfillmentController.updateStatus(created.id, legacy.status);
		}
		migrated += 1;
	}

	await markBackfillComplete(storeModule.id, settings);
	if (migrated > 0) {
		logger.info("Legacy Orders fulfillments backfilled into Fulfillment owner", {
			migrated,
		});
	}
}

async function markBackfillComplete(
	moduleId: string,
	settings: Record<string, unknown>,
): Promise<void> {
	await db.module.update({
		where: { id: moduleId },
		data: {
			settings: {
				...settings,
				[BACKFILL_MARKER]: true,
			},
		},
	});
}
