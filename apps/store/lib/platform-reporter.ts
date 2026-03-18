/**
 * Platform reporter — syncs commerce events to the 86d dashboard.
 *
 * When 86D_API_KEY is configured, this subscribes to the store's EventBus
 * and reports entity data (orders, payments, customers) to the dashboard's
 * /api/store-events endpoint. This populates the Money / Commerce sections
 * in the dashboard for deployed stores.
 *
 * The reporter is non-blocking: failures are logged but never break the store.
 */

import type { EventBus, ModuleEvent } from "@86d-app/core";
import { logger } from "utils/logger";

/**
 * Minimal DB interface for querying module data.
 * Avoids importing the full Prisma client type.
 */
interface PlatformReporterDb {
	module: {
		findUnique(args: {
			where: { storeId_name: { storeId: string; name: string } };
			select: { id: boolean };
		}): Promise<{ id: string } | null>;
	};
	moduleData: {
		findMany(args: {
			where: { moduleId: string; entityType: string };
			select: {
				entityType: boolean;
				entityId: boolean;
				data: boolean;
			};
			orderBy: { updatedAt: "desc" | "asc" };
			take: number;
		}): Promise<
			Array<{
				entityType: string;
				entityId: string;
				data: unknown;
			}>
		>;
		findFirst(args: {
			where: {
				moduleId: string;
				entityType: string;
				entityId?: string;
			};
			select: {
				entityType: boolean;
				entityId: boolean;
				data: boolean;
			};
		}): Promise<{
			entityType: string;
			entityId: string;
			data: unknown;
		} | null>;
	};
}

interface PlatformReporterConfig {
	apiUrl: string;
	apiKey: string;
	storeId: string;
}

interface EntityPayload {
	module: string;
	entityType: string;
	entityId: string;
	data: Record<string, unknown>;
}

/**
 * Map event types to the modules and entity types that should be synced.
 */
const EVENT_SYNC_MAP: Record<
	string,
	Array<{ module: string; entityType: string }>
> = {
	"checkout.completed": [
		{ module: "orders", entityType: "order" },
		{ module: "payments", entityType: "paymentIntent" },
		{ module: "customers", entityType: "customer" },
	],
	"order.placed": [{ module: "orders", entityType: "order" }],
	"order.shipped": [{ module: "orders", entityType: "order" }],
	"order.delivered": [{ module: "orders", entityType: "order" }],
	"order.cancelled": [{ module: "orders", entityType: "order" }],
	"order.completed": [{ module: "orders", entityType: "order" }],
	"order.fulfilled": [{ module: "orders", entityType: "order" }],
	"order.refunded": [
		{ module: "orders", entityType: "order" },
		{ module: "payments", entityType: "refund" },
	],
	"payment.completed": [{ module: "payments", entityType: "paymentIntent" }],
	"payment.failed": [{ module: "payments", entityType: "paymentIntent" }],
	"payment.refunded": [
		{ module: "payments", entityType: "paymentIntent" },
		{ module: "payments", entityType: "refund" },
	],
	"customer.created": [{ module: "customers", entityType: "customer" }],
};

/**
 * Resolve entity data from the store's DB based on event payload.
 * Extracts IDs from the event to query specific records.
 */
async function resolveEntities(
	db: PlatformReporterDb,
	storeId: string,
	event: ModuleEvent,
	targets: Array<{ module: string; entityType: string }>,
): Promise<EntityPayload[]> {
	const entities: EntityPayload[] = [];
	const payload = (event.payload ?? {}) as Record<string, unknown>;

	for (const target of targets) {
		const moduleRecord = await db.module
			.findUnique({
				where: {
					storeId_name: { storeId, name: target.module },
				},
				select: { id: true },
			})
			.catch(() => null);

		if (!moduleRecord) continue;

		// Try to find the specific entity using IDs from the event payload
		const entityId = resolveEntityId(target, payload);

		if (entityId) {
			const record = await db.moduleData
				.findFirst({
					where: {
						moduleId: moduleRecord.id,
						entityType: target.entityType,
						entityId,
					},
					select: { entityType: true, entityId: true, data: true },
				})
				.catch(() => null);

			if (record?.data && typeof record.data === "object") {
				entities.push({
					module: target.module,
					entityType: record.entityType,
					entityId: record.entityId,
					data: record.data as Record<string, unknown>,
				});
			}
		} else {
			// No specific ID — send the most recently updated entities of this type
			const records = await db.moduleData
				.findMany({
					where: {
						moduleId: moduleRecord.id,
						entityType: target.entityType,
					},
					select: { entityType: true, entityId: true, data: true },
					orderBy: { updatedAt: "desc" },
					take: 5,
				})
				.catch(() => []);

			for (const record of records) {
				if (record.data && typeof record.data === "object") {
					entities.push({
						module: target.module,
						entityType: record.entityType,
						entityId: record.entityId,
						data: record.data as Record<string, unknown>,
					});
				}
			}
		}
	}

	return entities;
}

/**
 * Determine the entity ID from the event payload based on the target entity type.
 */
function resolveEntityId(
	target: { module: string; entityType: string },
	payload: Record<string, unknown>,
): string | undefined {
	switch (target.entityType) {
		case "order":
			return typeof payload.orderId === "string" ? payload.orderId : undefined;
		case "paymentIntent":
			return typeof payload.paymentIntentId === "string"
				? payload.paymentIntentId
				: undefined;
		case "customer":
			return typeof payload.customerId === "string"
				? payload.customerId
				: undefined;
		case "refund":
			return typeof payload.refundId === "string"
				? payload.refundId
				: undefined;
		default:
			return undefined;
	}
}

/**
 * Send entities to the 86d dashboard's store-events endpoint.
 */
async function reportEntities(
	config: PlatformReporterConfig,
	entities: EntityPayload[],
	eventType?: string,
): Promise<void> {
	if (entities.length === 0) return;

	const url = `${config.apiUrl}/store-events`;
	const body: { entities: EntityPayload[]; eventType?: string } = { entities };
	if (eventType) {
		body.eventType = eventType;
	}

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(10_000),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Dashboard rejected events: ${response.status} ${text.slice(0, 200)}`,
		);
	}
}

/**
 * Register platform reporting handlers on the event bus.
 * Returns an unsubscribe function.
 */
export function registerPlatformReporter(
	bus: EventBus,
	db: PlatformReporterDb,
	config: PlatformReporterConfig,
): () => void {
	const handler = async (event: ModuleEvent) => {
		const targets = EVENT_SYNC_MAP[event.type];
		if (!targets) return;

		try {
			const entities = await resolveEntities(
				db,
				config.storeId,
				event,
				targets,
			);
			await reportEntities(config, entities, event.type);

			logger.info("Platform events reported", {
				event: event.type,
				entities: entities.length,
			});
		} catch (err) {
			logger.warn("Platform reporting failed", {
				event: event.type,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const eventTypes = Object.keys(EVENT_SYNC_MAP);
	const unsubs = eventTypes.map((eventType) => bus.on(eventType, handler));

	logger.info("Platform reporter registered", {
		events: eventTypes.length,
		apiUrl: config.apiUrl,
	});

	return () => {
		for (const unsub of unsubs) {
			unsub();
		}
	};
}
