import type {
	AnyDurableEventConsumer,
	ModuleDataService,
} from "@86d-app/core";
import { consumeDurableEvent, defineDurableEvent } from "@86d-app/core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DurableEventDispatcher } from "../durable-event-dispatcher";

const adjusted = defineDurableEvent({
	name: "inventory.adjusted",
	version: 1,
	owner: "inventory",
	payload: z
		.object({ productId: z.string(), delta: z.number().int() })
		.strict(),
});

const claimed = {
	eventId: "11111111-1111-4111-8111-111111111111",
	consumer: "audit-log.inventory-adjusted.v1",
	leaseToken: "22222222-2222-4222-8222-222222222222",
	leaseOwner: "drain-worker-1",
	eventType: "inventory.adjusted",
	schemaVersion: 1,
	storeId: "33333333-3333-4333-8333-333333333333",
	sourceModule: "inventory",
	aggregateType: "inventory-item",
	aggregateId: "product-1:_:_",
	aggregateSequence: 1n,
	occurredAt: new Date("2026-08-12T12:00:00.000Z"),
	payload: { productId: "product-1", delta: 4 },
	attempts: 1,
};

function dataService(): ModuleDataService {
	return {
		get: vi.fn().mockResolvedValue(null),
		upsert: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		findMany: vi.fn().mockResolvedValue([]),
	};
}

function createDb(rows = [claimed]) {
	const tx = {
		$queryRawUnsafe: vi.fn().mockResolvedValue([
			{
				consumer: claimed.consumer,
				eventId: claimed.eventId,
				leaseToken: claimed.leaseToken,
				leaseOwner: claimed.leaseOwner,
				state: "processing",
			},
		]),
		moduleEventConsumption: {
			findUnique: vi.fn().mockResolvedValue(null),
			create: vi.fn().mockResolvedValue({}),
		},
		moduleEventDelivery: {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
		},
		moduleOutboxEvent: {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
		},
	};
	return {
		tx,
		db: {
			$queryRawUnsafe: vi.fn().mockResolvedValue(rows),
			$transaction: vi.fn(
				async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
			),
			moduleEventDelivery: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			},
			moduleOutboxEvent: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			},
		},
	};
}

function consumer(handle?: AnyDurableEventConsumer["handle"]) {
	return consumeDurableEvent({
		consumer: claimed.consumer,
		owner: "audit-log",
		definition: adjusted,
		handle:
			handle ??
			vi.fn(async (context, event) => {
				await context.data.upsert("auditEntry", event.id, {
					resource: event.aggregate.type,
				});
			}),
	});
}

describe("DurableEventDispatcher", () => {
	it("claims a bounded batch with lease fencing and aggregate-local head-of-line", async () => {
		const { db } = createDb([]);
		const dispatcher = new DurableEventDispatcher({
			db,
			consumers: [consumer()],
			storeId: claimed.storeId,
			getConsumerData: (_moduleId, _transaction) => dataService(),
		});

		await dispatcher.drain({
			limit: 7,
			leaseDurationMs: 30_000,
			now: new Date("2026-08-12T12:00:00.000Z"),
		});

		const [sql, storeId, consumers, limit] = db.$queryRawUnsafe.mock.calls[0];
		expect(sql).toMatch(/FOR UPDATE(?: OF delivery)? SKIP LOCKED/);
		expect(sql).toContain('prior."state" <> \'succeeded\'');
		expect(sql).toContain('prior_event."aggregateSequence" < event."aggregateSequence"');
		expect(sql).not.toContain('prior."nextAttemptAt"');
		expect(storeId).toBe(claimed.storeId);
		expect(consumers).toEqual([claimed.consumer]);
		expect(limit).toBe(7);
	});

	it("commits the consumer effect, dedupe receipt, and fenced success together", async () => {
		const { db, tx } = createDb();
		const ownedData = dataService();
		const handler = consumer();
		const dispatcher = new DurableEventDispatcher({
			db,
			consumers: [handler],
			storeId: claimed.storeId,
			getConsumerData: (_moduleId, transaction) => {
				expect(transaction).toBe(tx);
				return ownedData;
			},
		});

		const result = await dispatcher.drain({ limit: 1 });

		expect(result).toEqual({ claimed: 1, succeeded: 1, failed: 0 });
		expect(db.$transaction).toHaveBeenCalledOnce();
		expect(handler.handle).toHaveBeenCalledOnce();
		expect(tx.moduleEventConsumption.create).toHaveBeenCalledWith({
			data: { consumer: claimed.consumer, eventId: claimed.eventId },
		});
		expect(tx.moduleEventDelivery.updateMany).toHaveBeenCalledWith({
			where: {
				consumer: claimed.consumer,
				eventId: claimed.eventId,
				state: "processing",
				leaseToken: claimed.leaseToken,
				leaseOwner: claimed.leaseOwner,
			},
			data: expect.objectContaining({ state: "succeeded", leaseToken: null }),
		});
	});

	it("skips a duplicate receipt while still completing its delivery", async () => {
		const { db, tx } = createDb();
		tx.moduleEventConsumption.findUnique.mockResolvedValue({ consumedAt: new Date() });
		const handler = consumer();
		const dispatcher = new DurableEventDispatcher({
			db,
			consumers: [handler],
			storeId: claimed.storeId,
			getConsumerData: (_moduleId, _transaction) => dataService(),
		});

		const result = await dispatcher.drain({ limit: 1 });

		expect(result.succeeded).toBe(1);
		expect(handler.handle).not.toHaveBeenCalled();
		expect(tx.moduleEventConsumption.create).not.toHaveBeenCalled();
	});

	it("fences a stale claimant before the consumer handler can mutate state", async () => {
		const { db, tx } = createDb();
		tx.$queryRawUnsafe.mockResolvedValue([]);
		const handler = consumer();
		const dispatcher = new DurableEventDispatcher({
			db,
			consumers: [handler],
			storeId: claimed.storeId,
			getConsumerData: (_moduleId, _transaction) => dataService(),
		});

		const result = await dispatcher.drain({ limit: 1 });

		expect(result).toEqual({ claimed: 1, succeeded: 0, failed: 0 });
		expect(handler.handle).not.toHaveBeenCalled();
		expect(tx.moduleEventConsumption.create).not.toHaveBeenCalled();
		expect(db.moduleEventDelivery.updateMany).not.toHaveBeenCalled();
	});

	it("rolls back the consumer effect and records bounded retry state on failure", async () => {
		const { db, tx } = createDb();
		db.$transaction.mockRejectedValueOnce(
			new Error(`provider ${"secret-".repeat(150)} failed`),
		);
		const dispatcher = new DurableEventDispatcher({
			db,
			consumers: [consumer()],
			storeId: claimed.storeId,
			getConsumerData: (_moduleId, _transaction) => dataService(),
		});

		const result = await dispatcher.drain({
			limit: 1,
			now: new Date("2026-08-12T12:00:00.000Z"),
		});

		expect(result).toEqual({ claimed: 1, succeeded: 0, failed: 1 });
		const failure = db.moduleEventDelivery.updateMany.mock.calls[0][0];
		expect(failure.where.leaseToken).toBe(claimed.leaseToken);
		expect(failure.where.leaseOwner).toBe(claimed.leaseOwner);
		expect(failure.data.state).toBe("failed");
		expect(failure.data.lastError.length).toBeLessThanOrEqual(500);
		expect(failure.data.lastError).not.toContain("secret");
		expect(failure.data.nextAttemptAt.getTime()).toBeGreaterThan(
			new Date("2026-08-12T12:00:00.000Z").getTime(),
		);
		expect(tx.moduleEventConsumption.create).not.toHaveBeenCalled();
	});

	it("isolates a malformed persisted payload to its delivery", async () => {
		const { db } = createDb([
			{ ...claimed, payload: { productId: "product-1" } } as typeof claimed,
		]);
		const handler = consumer();
		const dispatcher = new DurableEventDispatcher({
			db,
			consumers: [handler],
			storeId: claimed.storeId,
			getConsumerData: (_moduleId, _transaction) => dataService(),
		});

		const result = await dispatcher.drain({ limit: 1 });

		expect(result.failed).toBe(1);
		expect(handler.handle).not.toHaveBeenCalled();
		expect(db.moduleEventDelivery.updateMany).toHaveBeenCalledOnce();
	});
});
