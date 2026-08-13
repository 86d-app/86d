/**
 * Durable event delivery for this Store Runtime.
 *
 * The dispatcher creates no timer and no background process: a caller decides
 * when to drain. Delivery is at-least-once and every consumer commits its effect
 * with a dedupe receipt, so draining more often than necessary is harmless and
 * draining late only delays delivery.
 */

import { DurableEventDispatcher } from "@86d-app/runtime/durable-event-dispatcher";
import type { ModuleRegistry } from "@86d-app/runtime/registry";
import { UniversalDataService } from "@86d-app/runtime/universal-data-service";
import { db } from "db";
import env from "env";
import { logger } from "utils/logger";

/** Deliveries claimed per drain. Bounded so one request cannot stall on a backlog. */
const DRAIN_LIMIT = 20;

/** A claimed delivery is redeliverable after this lease expires. */
const LEASE_MS = 30_000;

let dispatcher: DurableEventDispatcher | undefined;
let dispatcherRegistry: ModuleRegistry | undefined;
let draining: Promise<void> | undefined;

function getDispatcher(
	registry: ModuleRegistry,
	storeId: string,
): DurableEventDispatcher | undefined {
	// A re-booted registry produces new Module row IDs, so the dispatcher is
	// rebuilt rather than reused across boots.
	if (dispatcher && dispatcherRegistry === registry) return dispatcher;

	const consumers = registry.getDurableEventConsumers();
	if (consumers.length === 0) {
		dispatcherRegistry = registry;
		dispatcher = undefined;
		return undefined;
	}

	dispatcher = new DurableEventDispatcher({
		db,
		storeId,
		consumers,
		getConsumerData: (moduleId, transaction) => {
			const moduleDbId = registry.getModuleDbId(moduleId);
			if (!moduleDbId) {
				// Fail the delivery rather than write with a guessed owner.
				throw new Error(`Module "${moduleId}" is not initialized.`);
			}
			return new UniversalDataService({
				db: transaction,
				storeId,
				moduleId,
				moduleDbId,
			});
		},
	});
	dispatcherRegistry = registry;
	return dispatcher;
}

/**
 * Deliver a bounded batch of committed durable events.
 *
 * Never throws: a delivery problem must not change the outcome of the request
 * that happened to trigger the drain. The events stay in the outbox.
 */
export async function drainDurableEvents(
	registry: ModuleRegistry,
): Promise<void> {
	const storeId = env.STORE_ID;
	if (!storeId || !registry.isReady()) return;

	// One drain at a time in this process. Concurrent drains are safe — claims
	// use `FOR UPDATE SKIP LOCKED` — but serializing avoids pointless contention.
	if (draining) return draining;

	draining = (async () => {
		try {
			const active = getDispatcher(registry, storeId);
			if (!active) return;
			const result = await active.drain({
				limit: DRAIN_LIMIT,
				leaseDurationMs: LEASE_MS,
			});
			if (result.failed > 0 || result.deadLettered > 0) {
				logger.warn("Durable event delivery reported failures", {
					claimed: result.claimed,
					succeeded: result.succeeded,
					failed: result.failed,
					deadLettered: result.deadLettered,
				});
			}
		} catch (error) {
			logger.error("Durable event drain failed", {
				reason: error instanceof Error ? error.message : String(error),
			});
		} finally {
			draining = undefined;
		}
	})();

	return draining;
}

/** Test seam: forget the memoized dispatcher. */
export function resetDurableEventDispatcher(): void {
	dispatcher = undefined;
	dispatcherRegistry = undefined;
	draining = undefined;
}
