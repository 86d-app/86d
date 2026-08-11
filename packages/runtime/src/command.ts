import { createHmac, randomUUID } from "node:crypto";
import {
	type ActionLevel,
	type ActorReference,
	type AuditEvent,
	type AuthoritativePlane,
	type AuthoritySnapshot,
	actorReferenceSchema,
	authoritySnapshotSchema,
	type CommandExecutionResponse,
	type CommandFailure,
	type CommandReference,
	type CommandRequest,
	commandFailureSchema,
	commandReferenceSchema,
	commandRequestSchema,
	type JsonValue,
	jsonValueSchema,
	type TargetReference,
	targetReferenceSchema,
} from "@86d-app/core";

type ParseResult<T> =
	| { success: true; data: T }
	| { success: false; error: unknown };

type RuntimeSchema<T = unknown> = {
	safeParse(value: unknown): ParseResult<T>;
};

export type CommandPrincipal =
	| {
			type: "session";
			credentialId: string;
			sessionId: string;
	  }
	| {
			type: "workload";
			credentialId: string;
	  }
	| {
			type: "system";
			credentialId: string;
	  };

export interface CommandExecutionContext {
	principal: CommandPrincipal;
}

export type CommandAuthorizationResult =
	| {
			ok: true;
			actor: ActorReference;
			authority: AuthoritySnapshot;
			target: TargetReference;
	  }
	| {
			ok: false;
			failure: CommandFailure;
	  };

export interface CommandAuthority {
	authorize(args: {
		principal: CommandPrincipal;
		request: CommandRequest;
		definition: CommandDefinitionReference;
	}): Promise<CommandAuthorizationResult>;
	canRead(args: {
		principal: CommandPrincipal;
		execution: PersistedCommandExecution;
	}): Promise<boolean>;
}

/** Policy seam for validating approval and fresh-confirmation grants. */
export interface CommandGrantEvaluator {
	evaluate(input: {
		principal: CommandPrincipal;
		command: CommandReference;
		actionLevel: ActionLevel;
		actor: ActorReference;
		authority: AuthoritySnapshot;
		target: TargetReference;
		inputDigest: string;
		approvalReference?: string | undefined;
		confirmationReference?: string | undefined;
	}): Promise<{ ok: true } | { ok: false; failure: CommandFailure }>;
}

export interface CommandDefinitionReference {
	command: CommandReference;
	ownerPlane: AuthoritativePlane;
	targetType: TargetReference["type"];
	actionLevel: ActionLevel;
}

type CommandHandlerResult<TResult, TFailureDetails> =
	| { ok: true; result: TResult }
	| {
			ok: false;
			failure: Omit<CommandFailure, "details"> & {
				details?: TFailureDetails | undefined;
			};
	  };

type NormalizedCommandOutcome =
	| { ok: true; result: JsonValue }
	| { ok: false; failure: CommandFailure };

interface TypedCommandDefinition<TTransaction, TInput, TResult, TFailureDetails>
	extends CommandDefinitionReference {
	inputSchema: RuntimeSchema<TInput>;
	resultSchema: RuntimeSchema<TResult>;
	failureDetailsSchema?: RuntimeSchema<TFailureDetails> | undefined;
	sensitiveInputPaths?: readonly string[] | undefined;
	sensitiveResultPaths?: readonly string[] | undefined;
	execute(args: {
		actor: ActorReference;
		authority: AuthoritySnapshot;
		target: TargetReference;
		input: TInput;
		transaction: TTransaction;
	}): Promise<CommandHandlerResult<TResult, TFailureDetails>>;
}

export interface DefinedCommand<TTransaction>
	extends CommandDefinitionReference {
	sensitiveInputPaths?: readonly string[] | undefined;
	sensitiveResultPaths: readonly string[];
	parseInput(value: unknown): ParseResult<JsonValue>;
	execute(args: {
		actor: ActorReference;
		authority: AuthoritySnapshot;
		target: TargetReference;
		input: JsonValue;
		transaction: TTransaction;
	}): Promise<NormalizedCommandOutcome>;
}

/**
 * Define a Command while preserving inference for its validated input, result,
 * failure details, and transaction adapter.
 */
export function defineCommand<TTransaction>() {
	return <TInput, TResult, TFailureDetails = never>(
		definition: TypedCommandDefinition<
			TTransaction,
			TInput,
			TResult,
			TFailureDetails
		>,
	): DefinedCommand<TTransaction> => ({
		command: definition.command,
		ownerPlane: definition.ownerPlane,
		targetType: definition.targetType,
		actionLevel: definition.actionLevel,
		sensitiveInputPaths: definition.sensitiveInputPaths,
		sensitiveResultPaths: definition.sensitiveResultPaths ?? [],
		parseInput(value) {
			const parsedInput = definition.inputSchema.safeParse(value);
			if (!parsedInput.success) {
				return { success: false, error: parsedInput.error };
			}
			return jsonValueSchema.safeParse(parsedInput.data);
		},
		async execute(args) {
			const parsedInput = definition.inputSchema.safeParse(args.input);
			if (!parsedInput.success) {
				return {
					ok: false,
					failure: commandFailure("invalid_input", "Command input is invalid."),
				};
			}

			const outcome = await definition.execute({
				actor: args.actor,
				authority: args.authority,
				target: args.target,
				input: parsedInput.data,
				transaction: args.transaction,
			});
			if (outcome.ok) {
				const parsedResult = definition.resultSchema.safeParse(outcome.result);
				if (!parsedResult.success) {
					return {
						ok: false,
						failure: commandFailure(
							"invalid_result",
							"Command returned an invalid result.",
						),
					};
				}
				const jsonResult = jsonValueSchema.safeParse(parsedResult.data);
				if (!jsonResult.success) {
					return {
						ok: false,
						failure: commandFailure(
							"invalid_result",
							"Command returned an invalid result.",
						),
					};
				}
				return { ok: true, result: jsonResult.data };
			}

			const parsedFailure = commandFailureSchema.safeParse(outcome.failure);
			if (!parsedFailure.success) {
				return {
					ok: false,
					failure: commandFailure(
						"execution_failed",
						"Command execution failed.",
					),
				};
			}
			const detailsAreValid =
				parsedFailure.data.details === undefined ||
				definition.failureDetailsSchema?.safeParse(parsedFailure.data.details)
					.success === true;
			if (!detailsAreValid) {
				return {
					ok: false,
					failure: commandFailure(
						"execution_failed",
						"Command execution failed.",
					),
				};
			}
			return { ok: false, failure: parsedFailure.data };
		},
	});
}

export interface PersistedCommandExecution {
	executionId: string;
	plane: AuthoritativePlane;
	command: CommandReference;
	target: TargetReference;
	actor: ActorReference;
	authority: AuthoritySnapshot;
	idempotencyKey: string;
	approvalReference?: string | undefined;
	confirmationReference?: string | undefined;
	actionLevel: ActionLevel;
	status: "running" | "succeeded" | "failed";
	inputDigest: string;
	redactedInput: JsonValue;
	startedAt: string;
	completedAt?: string | undefined;
	result?: JsonValue | undefined;
	failure?: CommandFailure | undefined;
	auditEvents: AuditEvent[];
}

type PersistenceCompletion = {
	execution: PersistedCommandExecution;
	commitTransaction: boolean;
};

type PersistenceRunResult =
	| { kind: "conflict" }
	| {
			kind: "execution";
			replayed: boolean;
			execution: PersistedCommandExecution;
	  };

/** Persistence seam kept behind the two-method Command executor interface. */
export interface CommandPersistence<TTransaction> {
	runOnce(args: {
		scope: string;
		inputDigest: string;
		initialExecution: PersistedCommandExecution;
		run(transaction: TTransaction): Promise<PersistenceCompletion>;
	}): Promise<PersistenceRunResult>;
	get(executionId: string): Promise<PersistedCommandExecution | undefined>;
}

export interface MemoryCommandTransaction {
	get(key: string): string | null;
	set(key: string, value: string): void;
}

function cloneExecution(
	execution: PersistedCommandExecution,
): PersistedCommandExecution {
	return structuredClone(execution);
}

/**
 * In-memory adapter used by conformance tests. Its claim is installed before
 * execution begins, so identical concurrent requests share one execution.
 */
export function createInMemoryCommandPersistence(): CommandPersistence<MemoryCommandTransaction> {
	let state = new Map<string, string>();
	const executions = new Map<string, PersistedCommandExecution>();
	const claims = new Map<
		string,
		{
			inputDigest: string;
			completion: Promise<PersistedCommandExecution>;
		}
	>();

	return {
		async runOnce(args) {
			const existing = claims.get(args.scope);
			if (existing) {
				if (existing.inputDigest !== args.inputDigest) {
					return { kind: "conflict" };
				}
				return {
					kind: "execution",
					replayed: true,
					execution: cloneExecution(await existing.completion),
				};
			}

			let resolveCompletion:
				| ((execution: PersistedCommandExecution) => void)
				| undefined;
			let rejectCompletion: ((reason: unknown) => void) | undefined;
			const completion = new Promise<PersistedCommandExecution>(
				(resolve, reject) => {
					resolveCompletion = resolve;
					rejectCompletion = reject;
				},
			);
			claims.set(args.scope, {
				inputDigest: args.inputDigest,
				completion,
			});

			executions.set(
				args.initialExecution.executionId,
				cloneExecution(args.initialExecution),
			);
			const transactionState = new Map(state);
			const transaction: MemoryCommandTransaction = {
				get: (key) => transactionState.get(key) ?? null,
				set: (key, value) => {
					transactionState.set(key, value);
				},
			};

			try {
				const completed = await args.run(transaction);
				if (completed.commitTransaction) {
					state = transactionState;
				}
				const stored = cloneExecution(completed.execution);
				executions.set(stored.executionId, stored);
				resolveCompletion?.(cloneExecution(stored));
				return {
					kind: "execution",
					replayed: false,
					execution: cloneExecution(stored),
				};
			} catch (error) {
				claims.delete(args.scope);
				executions.delete(args.initialExecution.executionId);
				rejectCompletion?.(error);
				throw error;
			}
		},

		async get(executionId) {
			const execution = executions.get(executionId);
			return execution ? cloneExecution(execution) : undefined;
		},
	};
}

const AUTOMATIC_SENSITIVE_KEY =
	/(?:api[_-]?key|authorization|cookie|credential|password|secret|token)/i;

function isAutomaticallySensitive(key: string): boolean {
	return AUTOMATIC_SENSITIVE_KEY.test(key);
}

function redactInput(
	value: JsonValue,
	explicitPaths: ReadonlySet<string>,
	path: readonly string[] = [],
): JsonValue {
	if (Array.isArray(value)) {
		return value.map((item, index) =>
			redactInput(item, explicitPaths, [...path, String(index)]),
		);
	}
	if (value === null || typeof value !== "object") {
		return value;
	}

	const redacted: Record<string, JsonValue> = {};
	for (const [key, item] of Object.entries(value)) {
		const itemPath = [...path, key];
		redacted[key] =
			isAutomaticallySensitive(key) || explicitPaths.has(itemPath.join("."))
				? "[REDACTED]"
				: redactInput(item, explicitPaths, itemPath);
	}
	return redacted;
}

function canonicalize(value: JsonValue): JsonValue {
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}
	if (value === null || typeof value !== "object") {
		return value;
	}
	const canonical: Record<string, JsonValue> = {};
	const entries = Object.entries(value).sort(([left], [right]) =>
		left < right ? -1 : left > right ? 1 : 0,
	);
	for (const [key, item] of entries) {
		canonical[key] = canonicalize(item);
	}
	return canonical;
}

function canonicalString(value: JsonValue): string {
	return JSON.stringify(canonicalize(value));
}

function keyedDigest(key: string, value: JsonValue): string {
	return createHmac("sha256", key).update(canonicalString(value)).digest("hex");
}

function commandFailure(
	code: CommandFailure["code"],
	message: string,
	retryable = false,
): CommandFailure {
	return { code, message, retryable };
}

function defaultGrantEvaluation(input: {
	actionLevel: ActionLevel;
}): { ok: true } | { ok: false; failure: CommandFailure } {
	if (input.actionLevel === "automatic") return { ok: true };
	if (input.actionLevel === "approve") {
		return {
			ok: false,
			failure: commandFailure(
				"approval_required",
				"A validated approval is required for this Command.",
			),
		};
	}
	return {
		ok: false,
		failure: commandFailure(
			"confirmation_required",
			"A fresh validated confirmation is required for this Command.",
		),
	};
}

function hasMismatchedGrantReference(
	actionLevel: ActionLevel,
	request: Pick<CommandRequest, "approvalReference" | "confirmationReference">,
): boolean {
	if (actionLevel === "automatic") {
		return Boolean(request.approvalReference || request.confirmationReference);
	}
	if (actionLevel === "approve") {
		return request.confirmationReference !== undefined;
	}
	return request.approvalReference !== undefined;
}

function redactCommandFailure(failure: CommandFailure): CommandFailure {
	if (failure.details === undefined) return failure;
	return {
		...failure,
		details: redactInput(failure.details, new Set()),
	};
}

function definitionKey(command: CommandReference): string {
	return `${command.name}@${command.version}`;
}

function isCommandPrincipal(value: unknown): value is CommandPrincipal {
	if (!value || typeof value !== "object") return false;
	if (
		!("type" in value) ||
		(value.type !== "session" &&
			value.type !== "workload" &&
			value.type !== "system") ||
		!("credentialId" in value) ||
		typeof value.credentialId !== "string" ||
		value.credentialId.length === 0
	) {
		return false;
	}
	return (
		value.type !== "session" ||
		("sessionId" in value &&
			typeof value.sessionId === "string" &&
			value.sessionId.length > 0)
	);
}

function makeAuditEvent(args: {
	id: string;
	plane: AuthoritativePlane;
	type: "command.started" | "command.succeeded" | "command.failed";
	actor: ActorReference;
	authority: AuthoritySnapshot;
	target: TargetReference;
	command: CommandReference;
	occurredAt: string;
	data: JsonValue;
}): AuditEvent {
	return {
		id: args.id,
		version: 1,
		plane: args.plane,
		type: args.type,
		actor: args.actor,
		authority: args.authority,
		target: args.target,
		command: args.command,
		occurredAt: args.occurredAt,
		data: args.data,
	};
}

function receiptFromExecution(
	execution: PersistedCommandExecution,
	replayed: boolean,
): CommandExecutionResponse {
	const base = {
		executionId: execution.executionId,
		command: execution.command,
		target: execution.target,
		idempotencyKey: execution.idempotencyKey,
		actionLevel: execution.actionLevel,
		replayed,
		startedAt: execution.startedAt,
	};
	if (
		execution.status === "succeeded" &&
		execution.completedAt &&
		execution.result !== undefined
	) {
		return {
			ok: true,
			receipt: {
				...base,
				status: "succeeded",
				completedAt: execution.completedAt,
				result: execution.result,
			},
		};
	}
	if (
		execution.status === "failed" &&
		execution.completedAt &&
		execution.failure
	) {
		return {
			ok: false,
			failure: execution.failure,
			receipt: {
				...base,
				status: "failed",
				completedAt: execution.completedAt,
				failure: execution.failure,
			},
		};
	}
	return {
		ok: false,
		failure: commandFailure(
			"temporarily_unavailable",
			"Command execution is still running.",
			true,
		),
		receipt: { ...base, status: "running" },
	};
}

export type GetCommandExecutionResponse =
	| { ok: true; execution: PersistedCommandExecution }
	| { ok: false; failure: CommandFailure };

export interface CommandExecutor {
	execute(
		request: unknown,
		context: CommandExecutionContext,
	): Promise<CommandExecutionResponse>;
	get(
		executionId: string,
		context: CommandExecutionContext,
	): Promise<GetCommandExecutionResponse>;
}

export function createCommandExecutor<TTransaction>(options: {
	plane: AuthoritativePlane;
	definitions: readonly DefinedCommand<TTransaction>[];
	authority: CommandAuthority;
	persistence: CommandPersistence<TTransaction>;
	grants?: CommandGrantEvaluator | undefined;
	digestKey: string;
	clock?: (() => Date) | undefined;
	createId?: ((kind: "execution" | "audit") => string) | undefined;
}): CommandExecutor {
	if (
		typeof options.digestKey !== "string" ||
		new TextEncoder().encode(options.digestKey).byteLength < 32
	) {
		throw new Error("Command digest key must be at least 32 bytes.");
	}
	const clock = options.clock ?? (() => new Date());
	const createId = options.createId ?? (() => randomUUID());
	const definitions = new Map<string, DefinedCommand<TTransaction>>();
	for (const definition of options.definitions) {
		const parsed = commandReferenceSchema.parse(definition.command);
		const key = definitionKey(parsed);
		if (definitions.has(key)) {
			throw new Error(`Duplicate Command definition: ${key}`);
		}
		if (definition.ownerPlane !== options.plane) {
			throw new Error(`Command ${key} belongs to a different plane.`);
		}
		definitions.set(key, definition);
	}

	async function execute(
		rawRequest: unknown,
		context: CommandExecutionContext,
	): Promise<CommandExecutionResponse> {
		const parsedRequest = commandRequestSchema.safeParse(rawRequest);
		if (!parsedRequest.success) {
			return {
				ok: false,
				failure: commandFailure(
					"invalid_request",
					"Command request is invalid.",
				),
			};
		}
		if (!isCommandPrincipal(context?.principal)) {
			return {
				ok: false,
				failure: commandFailure(
					"unauthenticated",
					"A server-authenticated principal is required.",
				),
			};
		}

		const request = parsedRequest.data;
		const definition = definitions.get(definitionKey(request.command));
		if (!definition) {
			return {
				ok: false,
				failure: commandFailure(
					"unknown_command",
					"Command is not registered.",
				),
			};
		}
		if (request.target.type !== definition.targetType) {
			return {
				ok: false,
				failure: commandFailure(
					"invalid_request",
					"Command target type is invalid.",
				),
			};
		}

		const parsedInput = definition.parseInput(request.input);
		if (!parsedInput.success) {
			return {
				ok: false,
				failure: commandFailure("invalid_input", "Command input is invalid."),
			};
		}
		if (hasMismatchedGrantReference(definition.actionLevel, request)) {
			return {
				ok: false,
				failure: commandFailure(
					"invalid_request",
					"The grant reference does not match the Command action level.",
				),
			};
		}

		const authorization = await options.authority.authorize({
			principal: context.principal,
			request,
			definition,
		});
		if (!authorization.ok) {
			return { ok: false, failure: authorization.failure };
		}
		const actor = actorReferenceSchema.safeParse(authorization.actor);
		const authority = authoritySnapshotSchema.safeParse(
			authorization.authority,
		);
		const target = targetReferenceSchema.safeParse(authorization.target);
		if (
			!actor.success ||
			!authority.success ||
			!target.success ||
			target.data.type !== definition.targetType
		) {
			return {
				ok: false,
				failure: commandFailure(
					"forbidden",
					"Command authority could not resolve the target.",
				),
			};
		}

		const digestMaterial: JsonValue = {
			input: parsedInput.data,
			approvalReference: request.approvalReference ?? null,
			confirmationReference: request.confirmationReference ?? null,
		};
		const inputDigest = keyedDigest(options.digestKey, digestMaterial);
		const grantInput = {
			principal: context.principal,
			command: request.command,
			actionLevel: definition.actionLevel,
			actor: actor.data,
			authority: authority.data,
			target: target.data,
			inputDigest,
			approvalReference: request.approvalReference,
			confirmationReference: request.confirmationReference,
		};
		const grant = options.grants
			? await options.grants.evaluate(grantInput)
			: defaultGrantEvaluation(grantInput);
		if (!grant.ok) return { ok: false, failure: grant.failure };

		const redactedInput = redactInput(
			parsedInput.data,
			new Set(definition.sensitiveInputPaths ?? []),
		);
		const scope = canonicalString({
			plane: options.plane,
			actor: actor.data,
			target: target.data,
			command: request.command,
			idempotencyKey: request.idempotencyKey,
		});

		const startedAt = clock().toISOString();
		const executionId = createId("execution");
		const startedAudit = makeAuditEvent({
			id: createId("audit"),
			plane: options.plane,
			type: "command.started",
			actor: actor.data,
			authority: authority.data,
			target: target.data,
			command: request.command,
			occurredAt: startedAt,
			data: { executionId, inputDigest },
		});
		const initialExecution: PersistedCommandExecution = {
			executionId,
			plane: options.plane,
			command: request.command,
			target: target.data,
			actor: actor.data,
			authority: authority.data,
			idempotencyKey: request.idempotencyKey,
			...(request.approvalReference
				? { approvalReference: request.approvalReference }
				: {}),
			...(request.confirmationReference
				? { confirmationReference: request.confirmationReference }
				: {}),
			actionLevel: definition.actionLevel,
			status: "running",
			inputDigest,
			redactedInput,
			startedAt,
			auditEvents: [startedAudit],
		};

		const runResult = await options.persistence.runOnce({
			scope,
			inputDigest,
			initialExecution,
			run: async (transaction) => {
				try {
					const outcome = await definition.execute({
						actor: actor.data,
						authority: authority.data,
						target: target.data,
						input: parsedInput.data,
						transaction,
					});
					if (outcome.ok) {
						const redactedResult = redactInput(
							outcome.result,
							new Set(definition.sensitiveResultPaths),
						);
						const finishedAt = clock().toISOString();
						const succeededAudit = makeAuditEvent({
							id: createId("audit"),
							plane: options.plane,
							type: "command.succeeded",
							actor: actor.data,
							authority: authority.data,
							target: target.data,
							command: request.command,
							occurredAt: finishedAt,
							data: { executionId },
						});
						return {
							commitTransaction: true,
							execution: {
								...initialExecution,
								status: "succeeded",
								completedAt: finishedAt,
								result: redactedResult,
								auditEvents: [startedAudit, succeededAudit],
							},
						};
					}

					throw outcome.failure;
				} catch (error) {
					const finishedAt = clock().toISOString();
					const parsedFailure = commandFailureSchema.safeParse(error);
					const failure = parsedFailure.success
						? redactCommandFailure(parsedFailure.data)
						: commandFailure("execution_failed", "Command execution failed.");
					const failedAudit = makeAuditEvent({
						id: createId("audit"),
						plane: options.plane,
						type: "command.failed",
						actor: actor.data,
						authority: authority.data,
						target: target.data,
						command: request.command,
						occurredAt: finishedAt,
						data: { executionId, code: failure.code },
					});
					return {
						commitTransaction: false,
						execution: {
							...initialExecution,
							status: "failed",
							completedAt: finishedAt,
							failure,
							auditEvents: [startedAudit, failedAudit],
						},
					};
				}
			},
		});

		if (runResult.kind === "conflict") {
			return {
				ok: false,
				failure: commandFailure(
					"idempotency_conflict",
					"The idempotency key was already used with different input.",
				),
			};
		}
		return receiptFromExecution(runResult.execution, runResult.replayed);
	}

	async function get(
		executionId: string,
		context: CommandExecutionContext,
	): Promise<GetCommandExecutionResponse> {
		if (!isCommandPrincipal(context?.principal)) {
			return {
				ok: false,
				failure: commandFailure(
					"unauthenticated",
					"A server-authenticated principal is required.",
				),
			};
		}
		const execution = await options.persistence.get(executionId);
		if (!execution) {
			return {
				ok: false,
				failure: commandFailure(
					"target_not_found",
					"Command execution was not found.",
				),
			};
		}
		const allowed = await options.authority.canRead({
			principal: context.principal,
			execution,
		});
		if (!allowed) {
			return {
				ok: false,
				failure: commandFailure(
					"forbidden",
					"Command execution is unavailable.",
				),
			};
		}
		return { ok: true, execution };
	}

	return { execute, get };
}
