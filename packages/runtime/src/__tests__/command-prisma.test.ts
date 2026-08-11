import { describe, expect, it, vi } from "vitest";
import type { PersistedCommandExecution } from "../command";
import { createPrismaCommandPersistence } from "../command-prisma";

const startedAt = "2026-08-11T20:00:00.000Z";
const completedAt = "2026-08-11T20:00:01.000Z";
const digest = "a".repeat(64);

const initialExecution: PersistedCommandExecution = {
	executionId: "execution-1",
	plane: "store_runtime",
	command: { name: "store_runtime.tracer.write", version: 1 },
	target: { type: "store", id: "store-1" },
	actor: { type: "account", id: "account-1" },
	authority: {
		id: "membership-1",
		type: "store_membership",
		role: "owner",
		permissions: ["store:update"],
		storeId: "store-1",
	},
	idempotencyKey: "idempotency-1",
	actionLevel: "automatic",
	status: "running",
	inputDigest: digest,
	redactedInput: { value: "updated" },
	startedAt,
	auditEvents: [
		{
			id: "audit-1",
			version: 1,
			plane: "store_runtime",
			type: "command.started",
			actor: { type: "account", id: "account-1" },
			authority: {
				id: "membership-1",
				type: "store_membership",
				role: "owner",
				permissions: ["store:update"],
				storeId: "store-1",
			},
			target: { type: "store", id: "store-1" },
			command: { name: "store_runtime.tracer.write", version: 1 },
			occurredAt: startedAt,
			data: { executionId: "execution-1", inputDigest: digest },
		},
	],
};

const failedExecution: PersistedCommandExecution = {
	...initialExecution,
	status: "failed",
	completedAt,
	failure: {
		code: "execution_failed",
		message: "Command execution failed.",
		retryable: false,
	},
	auditEvents: [
		...initialExecution.auditEvents,
		{
			...initialExecution.auditEvents[0],
			id: "audit-2",
			type: "command.failed",
			occurredAt: completedAt,
			data: { executionId: "execution-1", code: "execution_failed" },
		},
	],
};

const succeededExecution: PersistedCommandExecution = {
	...initialExecution,
	status: "succeeded",
	completedAt,
	result: { value: "updated" },
	auditEvents: [
		...initialExecution.auditEvents,
		{
			...initialExecution.auditEvents[0],
			id: "audit-2",
			type: "command.succeeded",
			occurredAt: completedAt,
			data: { executionId: "execution-1" },
		},
	],
};

function executionRecord(
	status: "failed" | "running" | "succeeded" = "running",
	inputDigest = digest,
) {
	return {
		id: "execution-1",
		plane: "store_runtime",
		commandName: "store_runtime.tracer.write",
		commandVersion: 1,
		actionLevel: "automatic",
		idempotencyKey: "idempotency-1",
		inputDigest,
		redactedInput: { value: "updated" },
		actorType: "account",
		actorId: "account-1",
		actor: initialExecution.actor,
		authorityType: "store_membership",
		authorityId: "membership-1",
		authority: initialExecution.authority,
		targetType: "store",
		targetId: "store-1",
		target: initialExecution.target,
		status,
		result: status === "succeeded" ? { value: "updated" } : null,
		failure: status === "failed" ? failedExecution.failure : null,
		startedAt: new Date(startedAt),
		completedAt: status === "running" ? null : new Date(completedAt),
	};
}

function auditRecord(index = 0) {
	const event =
		failedExecution.auditEvents[index] ?? initialExecution.auditEvents[0];
	return {
		id: event.id,
		version: event.version,
		plane: event.plane,
		eventType: event.type,
		actorType: event.actor.type,
		actorId: event.actor.id,
		actor: event.actor,
		authorityType: event.authority.type,
		authorityId: event.authority.id,
		authority: event.authority,
		targetType: event.target.type,
		targetId: event.target.id,
		target: event.target,
		commandName: event.command?.name ?? null,
		commandVersion: event.command?.version ?? null,
		commandExecutionId: "execution-1",
		occurredAt: new Date(event.occurredAt),
		data: event.data,
	};
}

function transaction() {
	return {
		commandExecution: {
			create: vi.fn(async () => executionRecord()),
			findFirst: vi.fn(async () => executionRecord()),
			findUnique: vi.fn(async () => executionRecord()),
			updateMany: vi.fn(async () => ({ count: 1 })),
		},
		auditEvent: {
			create: vi.fn(async () => auditRecord()),
			findMany: vi.fn(async () => [auditRecord()]),
		},
		$executeRawUnsafe: vi.fn(async (_query: string) => 0),
	};
}

function clientFor(tx: ReturnType<typeof transaction>) {
	return {
		async $transaction<T>(run: (value: typeof tx) => Promise<T>): Promise<T> {
			return run(tx);
		},
	};
}

describe("Store Runtime Prisma Command persistence", () => {
	it("atomically claims an execution with its started audit", async () => {
		const tx = transaction();
		const client = clientFor(tx);
		const persistence = createPrismaCommandPersistence(client, {
			jsonNull: { prisma: "JsonNull" },
		});

		const result = await persistence.runOnce({
			scope: "opaque-executor-scope",
			inputDigest: digest,
			initialExecution,
			run: async () => ({
				commitTransaction: true,
				execution: succeededExecution,
			}),
		});

		expect(result).toMatchObject({
			kind: "execution",
			replayed: false,
		});
		expect(tx.commandExecution.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorId: "account-1",
				authorityId: "membership-1",
				targetId: "store-1",
				commandName: "store_runtime.tracer.write",
			}),
		});
		expect(tx.auditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				id: "audit-1",
				eventType: "command.started",
				commandExecutionId: "execution-1",
			}),
		});
	});

	it("classifies a unique-scope race as replay or digest conflict", async () => {
		const tx = transaction();
		tx.commandExecution.create.mockRejectedValue(
			Object.assign(new Error("unique"), { code: "P2002" }),
		);
		tx.commandExecution.findFirst.mockResolvedValue(
			executionRecord("succeeded"),
		);
		tx.auditEvent.findMany.mockResolvedValue([auditRecord()]);
		const persistence = createPrismaCommandPersistence(clientFor(tx), {
			jsonNull: { prisma: "JsonNull" },
		});
		const args = {
			scope: "opaque-executor-scope",
			inputDigest: digest,
			initialExecution,
			run: async () => ({
				commitTransaction: true,
				execution: initialExecution,
			}),
		};

		expect(await persistence.runOnce(args)).toMatchObject({
			kind: "execution",
			replayed: true,
			execution: { status: "succeeded" },
		});

		tx.commandExecution.findFirst.mockResolvedValue(
			executionRecord("succeeded", "b".repeat(64)),
		);
		expect(await persistence.runOnce(args)).toEqual({ kind: "conflict" });
	});

	it("rolls back handler writes while committing failure and audit", async () => {
		const tx = transaction();
		tx.commandExecution.findUnique
			.mockResolvedValueOnce(executionRecord("running"))
			.mockResolvedValueOnce(executionRecord("failed"));
		tx.auditEvent.findMany.mockResolvedValue([auditRecord(0), auditRecord(1)]);
		const persistence = createPrismaCommandPersistence(clientFor(tx), {
			jsonNull: { prisma: "JsonNull" },
		});

		const result = await persistence.runOnce({
			scope: "opaque-executor-scope",
			inputDigest: digest,
			initialExecution,
			run: async (value) => {
				expect(value).toBe(tx);
				return {
					commitTransaction: false,
					execution: failedExecution,
				};
			},
		});

		expect(tx.$executeRawUnsafe.mock.calls.map(([query]) => query)).toEqual([
			'SAVEPOINT "command_handler"',
			'ROLLBACK TO SAVEPOINT "command_handler"',
			'RELEASE SAVEPOINT "command_handler"',
		]);
		expect(tx.commandExecution.updateMany).toHaveBeenCalledWith({
			where: { id: "execution-1", status: "running" },
			data: expect.objectContaining({
				status: "failed",
				failure: expect.objectContaining({ code: "execution_failed" }),
			}),
		});
		expect(result).toMatchObject({
			kind: "execution",
			replayed: false,
			execution: { status: "failed" },
		});
	});
});
