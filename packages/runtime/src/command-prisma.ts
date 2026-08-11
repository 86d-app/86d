import {
	actorReferenceSchema,
	auditEventSchema,
	authoritativePlaneSchema,
	authoritySnapshotSchema,
	commandFailureSchema,
	commandReferenceSchema,
	commandStatusSchema,
	jsonValueSchema,
	targetReferenceSchema,
} from "@86d-app/core";
import type { CommandPersistence, PersistedCommandExecution } from "./command";

type DateValue = Date | string;

interface CommandExecutionRecord {
	id: string;
	plane: string;
	commandName: string;
	commandVersion: number;
	actionLevel: string;
	idempotencyKey: string;
	approvalId: string | null;
	confirmationId: string | null;
	inputDigest: string;
	redactedInput: unknown;
	actorType: string;
	actorId: string;
	actor: unknown;
	authorityType: string;
	authorityId: string;
	authority: unknown;
	targetType: string;
	targetId: string;
	target: unknown;
	status: string;
	result: unknown;
	failure: unknown;
	startedAt: DateValue;
	completedAt: DateValue | null;
}

interface AuditEventRecord {
	id: string;
	version: number;
	plane: string;
	eventType: string;
	actor: unknown;
	authority: unknown;
	target: unknown;
	commandName: string | null;
	commandVersion: number | null;
	workflowId?: string | null | undefined;
	occurredAt: DateValue;
	data: unknown;
}

interface CommandExecutionCreateArgs {
	data: Record<string, unknown>;
}

interface CommandExecutionFindFirstArgs {
	where: Record<string, unknown>;
}

interface CommandExecutionFindUniqueArgs {
	where: { id: string };
}

interface CommandExecutionUpdateManyArgs {
	where: { id: string; status: "running" };
	data: Record<string, unknown>;
}

interface AuditEventCreateArgs {
	data: Record<string, unknown>;
}

interface AuditEventFindManyArgs {
	where: { commandExecutionId: string };
	orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }];
}

/** Narrow generated-Prisma surface kept behind Command persistence. */
export interface PrismaCommandTransaction {
	commandExecution: {
		create(args: CommandExecutionCreateArgs): Promise<unknown>;
		findFirst(
			args: CommandExecutionFindFirstArgs,
		): Promise<CommandExecutionRecord | null>;
		findUnique(
			args: CommandExecutionFindUniqueArgs,
		): Promise<CommandExecutionRecord | null>;
		updateMany(
			args: CommandExecutionUpdateManyArgs,
		): Promise<{ count: number }>;
	};
	auditEvent: {
		create(args: AuditEventCreateArgs): Promise<unknown>;
		findMany(args: AuditEventFindManyArgs): Promise<AuditEventRecord[]>;
	};
	$executeRawUnsafe(query: string): Promise<unknown>;
}

export interface PrismaCommandClient<
	TTransaction extends PrismaCommandTransaction,
> {
	$transaction<T>(run: (transaction: TTransaction) => Promise<T>): Promise<T>;
}

interface PrismaCommandPersistenceOptions {
	/** Prisma.DbNull from the Store Runtime generated client. */
	databaseNull: unknown;
	/** Prisma.JsonNull from the Store Runtime generated client. */
	jsonNull: unknown;
	pollIntervalMs?: number | undefined;
	maxPollAttempts?: number | undefined;
}

function iso(value: DateValue): string {
	return value instanceof Date
		? value.toISOString()
		: new Date(value).toISOString();
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

function scopeWhere(execution: PersistedCommandExecution) {
	return {
		plane: execution.plane,
		actorType: execution.actor.type,
		actorId: execution.actor.id,
		authorityType: execution.authority.type,
		authorityId: execution.authority.id,
		targetType: execution.target.type,
		targetId: execution.target.id,
		commandName: execution.command.name,
		commandVersion: execution.command.version,
		idempotencyKey: execution.idempotencyKey,
	};
}

function auditCreateData(
	event: PersistedCommandExecution["auditEvents"][number],
	executionId: string,
): Record<string, unknown> {
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
		commandName: event.command?.name,
		commandVersion: event.command?.version,
		commandExecutionId: executionId,
		workflowId: event.workflowId,
		occurredAt: new Date(event.occurredAt),
		data: event.data,
	};
}

function parseAudit(record: AuditEventRecord) {
	const command =
		record.commandName === null || record.commandVersion === null
			? undefined
			: { name: record.commandName, version: record.commandVersion };
	return auditEventSchema.parse({
		id: record.id,
		version: record.version,
		plane: record.plane,
		type: record.eventType,
		actor: record.actor,
		authority: record.authority,
		target: record.target,
		...(command ? { command } : {}),
		...(record.workflowId ? { workflowId: record.workflowId } : {}),
		occurredAt: iso(record.occurredAt),
		data: record.data,
	});
}

function parseExecution(
	record: CommandExecutionRecord,
	audits: AuditEventRecord[],
): PersistedCommandExecution {
	const parsedStatus = commandStatusSchema.parse(record.status);
	if (parsedStatus === "pending") {
		throw new Error(
			"Store Runtime Commands do not persist a pending execution.",
		);
	}
	const completedAt = record.completedAt ? iso(record.completedAt) : undefined;
	const result =
		parsedStatus === "succeeded"
			? jsonValueSchema.parse(record.result)
			: undefined;
	const failure =
		parsedStatus === "failed"
			? commandFailureSchema.parse(record.failure)
			: undefined;
	const actionLevel =
		record.actionLevel === "automatic" ||
		record.actionLevel === "approve" ||
		record.actionLevel === "confirm_now"
			? record.actionLevel
			: undefined;
	if (!actionLevel) throw new Error("Stored Command action level is invalid.");
	return {
		executionId: record.id,
		plane: authoritativePlaneSchema.parse(record.plane),
		command: commandReferenceSchema.parse({
			name: record.commandName,
			version: record.commandVersion,
		}),
		target: targetReferenceSchema.parse(record.target),
		actor: actorReferenceSchema.parse(record.actor),
		authority: authoritySnapshotSchema.parse(record.authority),
		idempotencyKey: record.idempotencyKey,
		...(record.approvalId ? { approvalReference: record.approvalId } : {}),
		...(record.confirmationId
			? { confirmationReference: record.confirmationId }
			: {}),
		actionLevel,
		status: parsedStatus,
		inputDigest: record.inputDigest,
		redactedInput: jsonValueSchema.parse(record.redactedInput),
		startedAt: iso(record.startedAt),
		...(completedAt ? { completedAt } : {}),
		...(result === undefined ? {} : { result }),
		...(failure === undefined ? {} : { failure }),
		auditEvents: audits.map(parseAudit),
	};
}

async function loadExecution(
	transaction: PrismaCommandTransaction,
	id: string,
): Promise<PersistedCommandExecution | undefined> {
	const record = await transaction.commandExecution.findUnique({
		where: { id },
	});
	if (!record) return undefined;
	const audits = await transaction.auditEvent.findMany({
		where: { commandExecutionId: id },
		orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }],
	});
	return parseExecution(record, audits);
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Durable Store-plane adapter with DB-enforced scoped idempotency. */
export function createPrismaCommandPersistence<
	TTransaction extends PrismaCommandTransaction,
>(
	client: PrismaCommandClient<TTransaction>,
	options: PrismaCommandPersistenceOptions,
): CommandPersistence<TTransaction> {
	const pollIntervalMs = options.pollIntervalMs ?? 25;
	const maxPollAttempts = options.maxPollAttempts ?? 200;

	async function get(
		executionId: string,
	): Promise<PersistedCommandExecution | undefined> {
		return client.$transaction((transaction) =>
			loadExecution(transaction, executionId),
		);
	}

	async function waitForTerminal(
		executionId: string,
	): Promise<PersistedCommandExecution> {
		for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
			const execution = await get(executionId);
			if (!execution) throw new Error("Command execution not found.");
			if (execution.status !== "running") {
				return execution;
			}
			await delay(pollIntervalMs);
		}
		throw new Error("Timed out waiting for the Command execution.");
	}

	return {
		async runOnce(args) {
			try {
				await client.$transaction(async (transaction) => {
					const execution = args.initialExecution;
					await transaction.commandExecution.create({
						data: {
							id: execution.executionId,
							plane: execution.plane,
							commandName: execution.command.name,
							commandVersion: execution.command.version,
							actionLevel: execution.actionLevel,
							idempotencyKey: execution.idempotencyKey,
							approvalId: execution.approvalReference,
							confirmationId: execution.confirmationReference,
							inputDigest: execution.inputDigest,
							redactedInput: execution.redactedInput,
							actorType: execution.actor.type,
							actorId: execution.actor.id,
							actor: execution.actor,
							authorityType: execution.authority.type,
							authorityId: execution.authority.id,
							authority: execution.authority,
							targetType: execution.target.type,
							targetId: execution.target.id,
							target: execution.target,
							status: "running",
							startedAt: new Date(execution.startedAt),
						},
					});
					const startedAudit = execution.auditEvents[0];
					if (!startedAudit) {
						throw new Error("A Command start audit is required.");
					}
					await transaction.auditEvent.create({
						data: auditCreateData(startedAudit, execution.executionId),
					});
				});
			} catch (error) {
				if (!isUniqueConstraintError(error)) throw error;
				const existing = await client.$transaction(async (transaction) => {
					const record = await transaction.commandExecution.findFirst({
						where: scopeWhere(args.initialExecution),
					});
					if (!record) {
						throw new Error("The conflicting Command execution was not found.");
					}
					const audits = await transaction.auditEvent.findMany({
						where: { commandExecutionId: record.id },
						orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }],
					});
					return parseExecution(record, audits);
				});
				if (existing.inputDigest !== args.inputDigest) {
					return { kind: "conflict" };
				}
				const terminal =
					existing.status === "running"
						? await waitForTerminal(existing.executionId)
						: existing;
				return { kind: "execution", replayed: true, execution: terminal };
			}

			const terminal = await client.$transaction(async (transaction) => {
				const running = await transaction.commandExecution.findUnique({
					where: { id: args.initialExecution.executionId },
				});
				if (running?.status !== "running") {
					throw new Error("Only a running Command can be completed.");
				}
				await transaction.$executeRawUnsafe('SAVEPOINT "command_handler"');
				let completed: Awaited<ReturnType<typeof args.run>>;
				try {
					completed = await args.run(transaction);
					if (!completed.commitTransaction) {
						await transaction.$executeRawUnsafe(
							'ROLLBACK TO SAVEPOINT "command_handler"',
						);
					}
				} catch (error) {
					await transaction.$executeRawUnsafe(
						'ROLLBACK TO SAVEPOINT "command_handler"',
					);
					throw error;
				} finally {
					await transaction.$executeRawUnsafe(
						'RELEASE SAVEPOINT "command_handler"',
					);
				}

				const execution = completed.execution;
				if (execution.status !== "succeeded" && execution.status !== "failed") {
					throw new Error("A Command completion must be terminal.");
				}
				const completedAt = execution.completedAt;
				if (!completedAt)
					throw new Error("A completed Command needs a timestamp.");
				const updated = await transaction.commandExecution.updateMany({
					where: {
						id: args.initialExecution.executionId,
						status: "running",
					},
					data:
						execution.status === "succeeded"
							? {
									status: "succeeded",
									result: execution.result ?? options.jsonNull,
									failure: options.databaseNull,
									completedAt: new Date(completedAt),
								}
							: {
									status: "failed",
									result: options.databaseNull,
									failure: execution.failure ?? options.jsonNull,
									completedAt: new Date(completedAt),
								},
				});
				if (updated.count !== 1) {
					throw new Error("The Command completion claim was lost.");
				}
				const finalAudit = execution.auditEvents.at(-1);
				if (!finalAudit || finalAudit.id === execution.auditEvents[0]?.id) {
					throw new Error("A terminal Command audit is required.");
				}
				await transaction.auditEvent.create({
					data: auditCreateData(finalAudit, execution.executionId),
				});
				const stored = await loadExecution(transaction, execution.executionId);
				if (!stored) throw new Error("The completed Command was not found.");
				return stored;
			});

			return { kind: "execution", replayed: false, execution: terminal };
		},

		get,
	};
}
