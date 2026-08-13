import {
	type JsonValue,
	jsonValueSchema,
	type LockingModuleDataTransaction,
	type ModuleController,
	type ModuleDataService,
	type ModuleDataTransaction,
	type ModuleTransactionRunner,
	type PaymentConnectionCapability,
	type PaymentConnectionProvider,
	z,
} from "@86d-app/core";

const identifierSchema = z.string().trim().min(1).max(255);
const connectionNameSchema = z.string().trim().min(1).max(100);
const providerNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(/^[a-z][a-z0-9_-]*$/);
const secretReferenceSchema = z.string().trim().min(3).max(500);
const idempotencyKeySchema = z.string().trim().min(8).max(200);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const minorAmountSchema = z
	.number()
	.int()
	.positive()
	.max(Number.MAX_SAFE_INTEGER);
const providerReferenceSchema = z.string().min(1).max(500);

export const paymentConnectionCapabilitySchema = z.enum([
	"intent",
	"authorization",
	"capture",
	"refund",
	"void",
]);
export const paymentConnectionModeSchema = z.enum(["test", "live"]);
export const paymentConnectionHealthSchema = z.enum([
	"unknown",
	"healthy",
	"degraded",
	"unhealthy",
]);
export const paymentConnectionLifecycleSchema = z.enum([
	"draft",
	"enabled",
	"disabled",
	"revoked",
]);
export const paymentOperationStateSchema = z.enum([
	"pending",
	"running",
	"succeeded",
	"failed",
	"ambiguous",
	"needs_attention",
]);

const dateSchema = z.coerce.date();

export const paymentConnectionSchema = z
	.object({
		id: identifierSchema,
		name: connectionNameSchema,
		normalizedName: z.string().min(1).max(100),
		provider: providerNameSchema,
		mode: paymentConnectionModeSchema,
		capabilities: z
			.array(paymentConnectionCapabilitySchema)
			.min(1)
			.max(5)
			.refine((values) => new Set(values).size === values.length),
		health: paymentConnectionHealthSchema,
		lifecycle: paymentConnectionLifecycleSchema,
		secretReference: secretReferenceSchema,
		healthCheckedAt: dateSchema.optional(),
		enabledAt: dateSchema.optional(),
		disabledAt: dateSchema.optional(),
		revokedAt: dateSchema.optional(),
		createdAt: dateSchema,
		updatedAt: dateSchema,
	})
	.strict();

export type PaymentConnection = z.infer<typeof paymentConnectionSchema>;
export type PaymentConnectionHealth = z.infer<
	typeof paymentConnectionHealthSchema
>;
export type PaymentConnectionLifecycle = z.infer<
	typeof paymentConnectionLifecycleSchema
>;

export const paymentOperationPayloadSchema = z.discriminatedUnion("operation", [
	z
		.object({
			operation: z.literal("intent"),
			amount: minorAmountSchema,
			currency: currencySchema,
			metadata: jsonValueSchema.optional(),
		})
		.strict(),
	z
		.object({
			operation: z.literal("authorization"),
			amount: minorAmountSchema,
			currency: currencySchema,
			providerPaymentReference: providerReferenceSchema.optional(),
			metadata: jsonValueSchema.optional(),
		})
		.strict(),
	z
		.object({
			operation: z.literal("capture"),
			amount: minorAmountSchema,
			currency: currencySchema,
			providerPaymentReference: providerReferenceSchema,
			metadata: jsonValueSchema.optional(),
		})
		.strict(),
	z
		.object({
			operation: z.literal("refund"),
			amount: minorAmountSchema,
			currency: currencySchema,
			providerPaymentReference: providerReferenceSchema,
			reason: z.string().trim().min(1).max(500).optional(),
			metadata: jsonValueSchema.optional(),
		})
		.strict(),
	z
		.object({
			operation: z.literal("void"),
			providerPaymentReference: providerReferenceSchema,
			metadata: jsonValueSchema.optional(),
		})
		.strict(),
]);

const primaryOperationPayloadSchema = z.discriminatedUnion("operation", [
	paymentOperationPayloadSchema.options[0],
	paymentOperationPayloadSchema.options[1],
]);
const continuationOperationPayloadSchema = z.discriminatedUnion("operation", [
	paymentOperationPayloadSchema.options[2],
	paymentOperationPayloadSchema.options[3],
	paymentOperationPayloadSchema.options[4],
]);

export const paymentOperationExecutionInputSchema = z.union([
	z
		.object({
			paymentId: identifierSchema,
			connectionId: identifierSchema,
			idempotencyKey: idempotencyKeySchema,
			payload: primaryOperationPayloadSchema,
		})
		.strict(),
	z
		.object({
			paymentId: identifierSchema,
			sourceOperationId: identifierSchema,
			idempotencyKey: idempotencyKeySchema,
			payload: continuationOperationPayloadSchema,
		})
		.strict(),
]);

export type PaymentOperationExecutionInput = z.infer<
	typeof paymentOperationExecutionInputSchema
>;

export const paymentOperationSchema = z
	.object({
		id: identifierSchema,
		paymentId: identifierSchema,
		connectionId: identifierSchema,
		sourceOperationId: identifierSchema.optional(),
		operation: paymentConnectionCapabilitySchema,
		idempotencyKey: idempotencyKeySchema,
		requestDigest: digestSchema,
		requestDigestVersion: z.literal(1),
		state: paymentOperationStateSchema,
		attempt: z.number().int().positive(),
		providerReference: providerReferenceSchema.optional(),
		outcome: jsonValueSchema.optional(),
		needsAttentionReason: z.string().min(1).max(500).optional(),
		needsAttentionAt: dateSchema.optional(),
		completedAt: dateSchema.optional(),
		createdAt: dateSchema,
		updatedAt: dateSchema,
	})
	.strict();

export type PaymentOperation = z.infer<typeof paymentOperationSchema>;

export const paymentOperationAttemptSchema = z
	.object({
		id: identifierSchema,
		paymentOperationId: identifierSchema,
		connectionId: identifierSchema,
		attempt: z.number().int().positive(),
		idempotencyKey: idempotencyKeySchema,
		requestDigest: digestSchema,
		state: z.enum(["running", "succeeded", "failed", "ambiguous"]),
		providerReference: providerReferenceSchema.optional(),
		outcome: jsonValueSchema.optional(),
		startedAt: dateSchema,
		finishedAt: dateSchema.optional(),
	})
	.strict();

export type PaymentOperationAttempt = z.infer<
	typeof paymentOperationAttemptSchema
>;

export const createPaymentConnectionInputSchema = z
	.object({
		id: identifierSchema.optional(),
		name: connectionNameSchema,
		provider: providerNameSchema,
		mode: paymentConnectionModeSchema,
		capabilities: z
			.array(paymentConnectionCapabilitySchema)
			.min(1)
			.max(5)
			.refine((values) => new Set(values).size === values.length),
		secretReference: secretReferenceSchema,
	})
	.strict();

export type CreatePaymentConnectionInput = z.infer<
	typeof createPaymentConnectionInputSchema
>;

const providerOutcomeSchema = z
	.object({
		state: z.enum(["succeeded", "failed", "ambiguous"]),
		providerReference: providerReferenceSchema.optional(),
		result: jsonValueSchema.optional(),
	})
	.strict();

export type PaymentConnectionErrorCode =
	| "connection_name_conflict"
	| "connection_not_found"
	| "connection_not_usable"
	| "connection_revoked"
	| "idempotency_conflict"
	| "invalid_operation_state"
	| "operation_not_found"
	| "provider_not_bound"
	| "transaction_unavailable";

export class PaymentConnectionError extends Error {
	readonly code: PaymentConnectionErrorCode;

	constructor(code: PaymentConnectionErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "PaymentConnectionError";
	}
}

export interface PaymentConnectionController extends ModuleController {
	createConnection(
		input: CreatePaymentConnectionInput,
	): Promise<PaymentConnection>;
	getConnection(id: string): Promise<PaymentConnection | null>;
	listConnections(): Promise<PaymentConnection[]>;
	setConnectionHealth(
		id: string,
		health: PaymentConnectionHealth,
	): Promise<PaymentConnection>;
	enableConnection(id: string): Promise<PaymentConnection>;
	disableConnection(id: string): Promise<PaymentConnection>;
	revokeConnection(id: string): Promise<PaymentConnection>;
	rotateSecretReference(
		id: string,
		secretReference: string,
	): Promise<PaymentConnection>;
	executeOperation(
		input: PaymentOperationExecutionInput,
	): Promise<PaymentOperation>;
	reconcileOperation(id: string): Promise<PaymentOperation>;
	markOperationNeedsAttention(
		id: string,
		reason: string,
	): Promise<PaymentOperation>;
	getOperation(id: string): Promise<PaymentOperation | null>;
	listOperationAttempts(id: string): Promise<PaymentOperationAttempt[]>;
}

function isLockingTransaction(
	transaction: ModuleDataTransaction,
): transaction is LockingModuleDataTransaction {
	return (
		"getForUpdate" in transaction &&
		typeof transaction.getForUpdate === "function"
	);
}

function canonicalJson(value: JsonValue): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value) ?? "null";
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key] ?? null)}`)
		.join(",")}}`;
}

async function sha256(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function normalizeConnectionName(name: string): string {
	return name.normalize("NFKC").toLocaleLowerCase("en-US");
}

function requireConnection(
	row: Record<string, unknown> | null,
): PaymentConnection {
	if (!row) {
		throw new PaymentConnectionError(
			"connection_not_found",
			"Payment Connection not found.",
		);
	}
	return paymentConnectionSchema.parse(row);
}

function requireOperation(
	row: Record<string, unknown> | null,
): PaymentOperation {
	if (!row) {
		throw new PaymentConnectionError(
			"operation_not_found",
			"Payment operation not found.",
		);
	}
	return paymentOperationSchema.parse(row);
}

function operationRecord(
	operation: PaymentOperation,
	overrides: Partial<PaymentOperation>,
) {
	return paymentOperationSchema.parse({ ...operation, ...overrides });
}

function connectionRecord(
	connection: PaymentConnection,
	overrides: Partial<PaymentConnection>,
) {
	return paymentConnectionSchema.parse({ ...connection, ...overrides });
}

export function createPaymentConnectionController(
	data: ModuleDataService,
	transactions: ModuleTransactionRunner | undefined,
	providers: readonly PaymentConnectionProvider[] = [],
): PaymentConnectionController {
	const providersByConnection = new Map<string, PaymentConnectionProvider>();
	for (const provider of providers) {
		identifierSchema.parse(provider.connectionId);
		providerNameSchema.parse(provider.provider);
		paymentConnectionModeSchema.parse(provider.mode);
		z.array(paymentConnectionCapabilitySchema)
			.min(1)
			.max(5)
			.parse(provider.capabilities);
		if (providersByConnection.has(provider.connectionId)) {
			throw new PaymentConnectionError(
				"provider_not_bound",
				`More than one provider adapter is bound to Payment Connection "${provider.connectionId}".`,
			);
		}
		providersByConnection.set(provider.connectionId, provider);
	}

	async function transact<T>(
		work: (transaction: LockingModuleDataTransaction) => Promise<T>,
	): Promise<T> {
		if (!transactions) {
			throw new PaymentConnectionError(
				"transaction_unavailable",
				"Payment Connection writes require owner-local transactions.",
			);
		}
		return transactions.transaction(async (transaction) => {
			if (!isLockingTransaction(transaction)) {
				throw new PaymentConnectionError(
					"transaction_unavailable",
					"Payment Connection writes require row locking.",
				);
			}
			return work(transaction);
		});
	}

	function providerFor(
		connection: PaymentConnection,
		capability: PaymentConnectionCapability,
	): PaymentConnectionProvider {
		const provider = providersByConnection.get(connection.id);
		if (
			!provider ||
			provider.provider !== connection.provider ||
			provider.mode !== connection.mode ||
			!provider.capabilities.includes(capability)
		) {
			throw new PaymentConnectionError(
				"provider_not_bound",
				"No matching provider adapter is bound to this Payment Connection.",
			);
		}
		return provider;
	}

	function requireUsable(
		connection: PaymentConnection,
		capability: PaymentConnectionCapability,
	): PaymentConnectionProvider {
		if (
			connection.lifecycle !== "enabled" ||
			connection.health !== "healthy" ||
			!connection.capabilities.includes(capability)
		) {
			throw new PaymentConnectionError(
				"connection_not_usable",
				"Payment Connection is not enabled and healthy for this operation.",
			);
		}
		return providerFor(connection, capability);
	}

	async function lock(
		transaction: LockingModuleDataTransaction,
		entityType: "paymentConnectionLockV2" | "paymentOperationLockV2",
		id: string,
	): Promise<void> {
		await transaction.upsert(entityType, id, { id });
		await transaction.getForUpdate(entityType, id);
	}

	async function resolveConnection(
		transaction: LockingModuleDataTransaction,
		input: PaymentOperationExecutionInput,
	): Promise<{
		connection: PaymentConnection;
		sourceOperationId?: string | undefined;
	}> {
		if ("connectionId" in input) {
			const connection = requireConnection(
				await transaction.get("paymentConnection", input.connectionId),
			);
			return { connection };
		}
		const source = requireOperation(
			await transaction.get("paymentOperationV2", input.sourceOperationId),
		);
		if (source.paymentId !== input.paymentId) {
			throw new PaymentConnectionError(
				"idempotency_conflict",
				"The source Payment operation belongs to another Payment.",
			);
		}
		if (
			source.state !== "succeeded" ||
			!source.providerReference ||
			input.payload.providerPaymentReference !== source.providerReference
		) {
			throw new PaymentConnectionError(
				"invalid_operation_state",
				"A continuation must use the succeeded source operation and its provider reference.",
			);
		}
		const validSource =
			(input.payload.operation === "capture" &&
				source.operation === "authorization") ||
			(input.payload.operation === "refund" &&
				["intent", "authorization", "capture"].includes(source.operation)) ||
			(input.payload.operation === "void" &&
				["intent", "authorization"].includes(source.operation));
		if (!validSource) {
			throw new PaymentConnectionError(
				"invalid_operation_state",
				`A ${input.payload.operation} cannot continue a ${source.operation} operation.`,
			);
		}
		const connection = requireConnection(
			await transaction.get("paymentConnection", source.connectionId),
		);
		return { connection, sourceOperationId: source.id };
	}

	async function claimOperation(
		input: PaymentOperationExecutionInput,
	): Promise<{
		operation: PaymentOperation;
		claimed: boolean;
	}> {
		const parsed = paymentOperationExecutionInputSchema.parse(input);
		const operationId = `payop_${await sha256(
			canonicalJson({
				paymentId: parsed.paymentId,
				operation: parsed.payload.operation,
				idempotencyKey: parsed.idempotencyKey,
			}),
		)}`;
		const operationIdempotencyKey = `${parsed.payload.operation}:${operationId}`;

		return transact(async (transaction) => {
			await lock(transaction, "paymentOperationLockV2", operationId);
			const { connection, sourceOperationId } = await resolveConnection(
				transaction,
				parsed,
			);

			const requestDigestInput = jsonValueSchema.parse({
				requestDigestVersion: 1,
				idempotencyKey: operationIdempotencyKey,
				paymentId: parsed.paymentId,
				connectionId: connection.id,
				sourceOperationId: sourceOperationId ?? null,
				payload: parsed.payload,
			});
			const requestDigest = await sha256(canonicalJson(requestDigestInput));
			const existingRow = await transaction.get(
				"paymentOperationV2",
				operationId,
			);
			if (existingRow) {
				const existing = paymentOperationSchema.parse(existingRow);
				if (
					existing.paymentId !== parsed.paymentId ||
					existing.connectionId !== connection.id ||
					existing.sourceOperationId !== sourceOperationId ||
					existing.operation !== parsed.payload.operation ||
					existing.idempotencyKey !== operationIdempotencyKey ||
					existing.requestDigest !== requestDigest
				) {
					throw new PaymentConnectionError(
						"idempotency_conflict",
						"The Payment operation key was already used for a different request.",
					);
				}
				if (existing.state !== "failed") {
					return { operation: existing, claimed: false };
				}
				const now = new Date();
				const attempt = existing.attempt + 1;
				const retried = operationRecord(existing, {
					state: "running",
					attempt,
					providerReference: undefined,
					outcome: undefined,
					completedAt: undefined,
					updatedAt: now,
				});
				const attemptRecord = paymentOperationAttemptSchema.parse({
					id: `${operationId}:${attempt}`,
					paymentOperationId: operationId,
					connectionId: connection.id,
					attempt,
					idempotencyKey: operationIdempotencyKey,
					requestDigest,
					state: "running",
					startedAt: now,
				});
				await transaction.upsert("paymentOperationV2", operationId, retried);
				await transaction.upsert(
					"paymentOperationAttemptV2",
					attemptRecord.id,
					attemptRecord,
				);
				return { operation: retried, claimed: true };
			}

			const now = new Date();
			const operation = paymentOperationSchema.parse({
				id: operationId,
				paymentId: parsed.paymentId,
				connectionId: connection.id,
				...(sourceOperationId ? { sourceOperationId } : {}),
				operation: parsed.payload.operation,
				idempotencyKey: operationIdempotencyKey,
				requestDigest,
				requestDigestVersion: 1,
				state: "running",
				attempt: 1,
				createdAt: now,
				updatedAt: now,
			});
			const attempt = paymentOperationAttemptSchema.parse({
				id: `${operationId}:1`,
				paymentOperationId: operationId,
				connectionId: connection.id,
				attempt: 1,
				idempotencyKey: operationIdempotencyKey,
				requestDigest,
				state: "running",
				startedAt: now,
			});
			await transaction.upsert("paymentOperationV2", operationId, operation);
			await transaction.upsert(
				"paymentOperationAttemptV2",
				attempt.id,
				attempt,
			);
			return { operation, claimed: true };
		});
	}

	async function recordOutcome(
		operationId: string,
		attemptNumber: number,
		outcomeInput: unknown,
	): Promise<PaymentOperation> {
		const outcome = providerOutcomeSchema.parse(outcomeInput);
		return transact(async (transaction) => {
			await lock(transaction, "paymentOperationLockV2", operationId);
			const operation = requireOperation(
				await transaction.getForUpdate("paymentOperationV2", operationId),
			);
			if (operation.attempt !== attemptNumber) return operation;
			if (
				operation.state !== "running" &&
				operation.state !== "ambiguous" &&
				operation.state !== "needs_attention"
			) {
				return operation;
			}
			if (
				operation.providerReference &&
				outcome.providerReference &&
				operation.providerReference !== outcome.providerReference
			) {
				throw new PaymentConnectionError(
					"invalid_operation_state",
					"Provider reconciliation returned a conflicting reference.",
				);
			}
			const now = new Date();
			const result = outcome.result ?? {};
			const updated = operationRecord(operation, {
				state: outcome.state,
				providerReference:
					outcome.providerReference ?? operation.providerReference,
				outcome: result,
				needsAttentionReason: undefined,
				needsAttentionAt: undefined,
				completedAt: outcome.state === "ambiguous" ? undefined : now,
				updatedAt: now,
			});
			const attemptId = `${operation.id}:${attemptNumber}`;
			const currentAttempt = paymentOperationAttemptSchema.parse(
				await transaction.get("paymentOperationAttemptV2", attemptId),
			);
			const attempt = paymentOperationAttemptSchema.parse({
				...currentAttempt,
				state: outcome.state,
				...((outcome.providerReference ?? operation.providerReference)
					? {
							providerReference:
								outcome.providerReference ?? operation.providerReference,
						}
					: {}),
				outcome: result,
				finishedAt: now,
			});
			await transaction.upsert("paymentOperationV2", operation.id, updated);
			await transaction.upsert(
				"paymentOperationAttemptV2",
				attempt.id,
				attempt,
			);
			return updated;
		});
	}

	async function claimReconciliation(
		operationId: string,
	): Promise<PaymentOperation> {
		return transact(async (transaction) => {
			await lock(transaction, "paymentOperationLockV2", operationId);
			const operation = requireOperation(
				await transaction.getForUpdate("paymentOperationV2", operationId),
			);
			if (
				!["running", "ambiguous", "needs_attention"].includes(operation.state)
			) {
				throw new PaymentConnectionError(
					"invalid_operation_state",
					"Only a running or ambiguous Payment operation can be reconciled.",
				);
			}
			const now = new Date();
			const attemptNumber = operation.attempt + 1;
			const updated = operationRecord(operation, {
				state: "running",
				attempt: attemptNumber,
				needsAttentionReason: undefined,
				needsAttentionAt: undefined,
				updatedAt: now,
			});
			const attempt = paymentOperationAttemptSchema.parse({
				id: `${operation.id}:${attemptNumber}`,
				paymentOperationId: operation.id,
				connectionId: operation.connectionId,
				attempt: attemptNumber,
				idempotencyKey: operation.idempotencyKey,
				requestDigest: operation.requestDigest,
				state: "running",
				startedAt: now,
			});
			await transaction.upsert("paymentOperationV2", operation.id, updated);
			await transaction.upsert(
				"paymentOperationAttemptV2",
				attempt.id,
				attempt,
			);
			return updated;
		});
	}

	return {
		async createConnection(input) {
			const parsed = createPaymentConnectionInputSchema.parse(input);
			const normalizedName = normalizeConnectionName(parsed.name);
			const lockId = `payment-connection-name:${await sha256(normalizedName)}`;
			return transact(async (transaction) => {
				await lock(transaction, "paymentConnectionLockV2", lockId);
				const matchingNames = await transaction.findMany("paymentConnection", {
					where: { normalizedName },
					take: 1,
				});
				if (matchingNames.length > 0) {
					throw new PaymentConnectionError(
						"connection_name_conflict",
						"A Payment Connection already uses this name.",
					);
				}
				const id = parsed.id ?? crypto.randomUUID();
				await lock(
					transaction,
					"paymentConnectionLockV2",
					`payment-connection-id:${id}`,
				);
				if (await transaction.get("paymentConnection", id)) {
					throw new PaymentConnectionError(
						"connection_name_conflict",
						"A Payment Connection already uses this ID.",
					);
				}
				const now = new Date();
				const connection = paymentConnectionSchema.parse({
					id,
					name: parsed.name,
					normalizedName,
					provider: parsed.provider,
					mode: parsed.mode,
					capabilities: parsed.capabilities,
					health: "unknown",
					lifecycle: "draft",
					secretReference: parsed.secretReference,
					createdAt: now,
					updatedAt: now,
				});
				await transaction.upsert("paymentConnection", id, connection);
				return connection;
			});
		},

		async getConnection(id) {
			const row = await data.get(
				"paymentConnection",
				identifierSchema.parse(id),
			);
			return row ? paymentConnectionSchema.parse(row) : null;
		},

		async listConnections() {
			const rows = await data.findMany("paymentConnection", {
				orderBy: { createdAt: "asc" },
			});
			return rows.map((row) => paymentConnectionSchema.parse(row));
		},

		async setConnectionHealth(id, health) {
			const connectionId = identifierSchema.parse(id);
			const parsedHealth = paymentConnectionHealthSchema.parse(health);
			return transact(async (transaction) => {
				const connection = requireConnection(
					await transaction.getForUpdate("paymentConnection", connectionId),
				);
				if (connection.lifecycle === "revoked") {
					throw new PaymentConnectionError(
						"connection_revoked",
						"A revoked Payment Connection cannot be updated.",
					);
				}
				const now = new Date();
				const updated = connectionRecord(connection, {
					health: parsedHealth,
					healthCheckedAt: now,
					updatedAt: now,
				});
				await transaction.upsert("paymentConnection", connectionId, updated);
				return updated;
			});
		},

		async enableConnection(id) {
			const connectionId = identifierSchema.parse(id);
			return transact(async (transaction) => {
				const connection = requireConnection(
					await transaction.getForUpdate("paymentConnection", connectionId),
				);
				if (connection.lifecycle === "revoked") {
					throw new PaymentConnectionError(
						"connection_revoked",
						"A revoked Payment Connection cannot be enabled.",
					);
				}
				if (connection.health !== "healthy") {
					throw new PaymentConnectionError(
						"connection_not_usable",
						"A Payment Connection must be healthy before enablement.",
					);
				}
				for (const capability of connection.capabilities) {
					providerFor(connection, capability);
				}
				const now = new Date();
				const updated = connectionRecord(connection, {
					lifecycle: "enabled",
					enabledAt: now,
					updatedAt: now,
				});
				await transaction.upsert("paymentConnection", connectionId, updated);
				return updated;
			});
		},

		async disableConnection(id) {
			const connectionId = identifierSchema.parse(id);
			return transact(async (transaction) => {
				const connection = requireConnection(
					await transaction.getForUpdate("paymentConnection", connectionId),
				);
				if (connection.lifecycle === "revoked") {
					throw new PaymentConnectionError(
						"connection_revoked",
						"A revoked Payment Connection cannot be disabled.",
					);
				}
				const now = new Date();
				const updated = connectionRecord(connection, {
					lifecycle: "disabled",
					disabledAt: now,
					updatedAt: now,
				});
				await transaction.upsert("paymentConnection", connectionId, updated);
				return updated;
			});
		},

		async revokeConnection(id) {
			const connectionId = identifierSchema.parse(id);
			return transact(async (transaction) => {
				const connection = requireConnection(
					await transaction.getForUpdate("paymentConnection", connectionId),
				);
				if (connection.lifecycle === "revoked") return connection;
				const now = new Date();
				const updated = connectionRecord(connection, {
					lifecycle: "revoked",
					revokedAt: now,
					updatedAt: now,
				});
				await transaction.upsert("paymentConnection", connectionId, updated);
				return updated;
			});
		},

		async rotateSecretReference(id, secretReference) {
			const connectionId = identifierSchema.parse(id);
			const reference = secretReferenceSchema.parse(secretReference);
			return transact(async (transaction) => {
				const connection = requireConnection(
					await transaction.getForUpdate("paymentConnection", connectionId),
				);
				if (connection.lifecycle === "revoked") {
					throw new PaymentConnectionError(
						"connection_revoked",
						"A revoked Payment Connection cannot rotate credentials.",
					);
				}
				const now = new Date();
				const updated = connectionRecord(connection, {
					secretReference: reference,
					health: "unknown",
					lifecycle:
						connection.lifecycle === "enabled"
							? "disabled"
							: connection.lifecycle,
					disabledAt:
						connection.lifecycle === "enabled" ? now : connection.disabledAt,
					updatedAt: now,
				});
				await transaction.upsert("paymentConnection", connectionId, updated);
				return updated;
			});
		},

		async executeOperation(input) {
			const parsed = paymentOperationExecutionInputSchema.parse(input);
			const claim = await claimOperation(parsed);
			if (!claim.claimed) return claim.operation;
			let provider: PaymentConnectionProvider;
			try {
				const connection = requireConnection(
					await data.get("paymentConnection", claim.operation.connectionId),
				);
				provider = requireUsable(connection, claim.operation.operation);
			} catch (error) {
				return recordOutcome(claim.operation.id, claim.operation.attempt, {
					state: "failed",
					result: {
						reason:
							error instanceof PaymentConnectionError
								? error.code
								: "connection_unavailable",
					},
				});
			}
			try {
				const outcome = providerOutcomeSchema.parse(
					await provider.execute({
						operationId: claim.operation.id,
						connectionId: claim.operation.connectionId,
						idempotencyKey: claim.operation.idempotencyKey,
						requestDigest: claim.operation.requestDigest,
						attempt: claim.operation.attempt,
						payload: parsed.payload,
					}),
				);
				return recordOutcome(
					claim.operation.id,
					claim.operation.attempt,
					outcome,
				);
			} catch {
				return recordOutcome(claim.operation.id, claim.operation.attempt, {
					state: "ambiguous",
					result: { reason: "provider_outcome_unknown" },
				});
			}
		},

		async reconcileOperation(id) {
			const operationId = identifierSchema.parse(id);
			const existing = requireOperation(
				await data.get("paymentOperationV2", operationId),
			);
			const connection = requireConnection(
				await data.get("paymentConnection", existing.connectionId),
			);
			const provider = providerFor(connection, existing.operation);
			const operation = await claimReconciliation(operationId);
			try {
				const outcome = providerOutcomeSchema.parse(
					await provider.reconcile({
						operationId: operation.id,
						connectionId: operation.connectionId,
						operation: operation.operation,
						idempotencyKey: operation.idempotencyKey,
						requestDigest: operation.requestDigest,
						attempt: operation.attempt,
						...(operation.providerReference
							? { providerReference: operation.providerReference }
							: {}),
					}),
				);
				const reconciled = await recordOutcome(
					operation.id,
					operation.attempt,
					outcome,
				);
				if (reconciled.state !== "ambiguous") return reconciled;
				return this.markOperationNeedsAttention(
					operation.id,
					"Provider reconciliation did not establish a final outcome.",
				);
			} catch {
				await recordOutcome(operation.id, operation.attempt, {
					state: "ambiguous",
					result: { reason: "provider_reconciliation_unknown" },
				});
				return this.markOperationNeedsAttention(
					operation.id,
					"Provider reconciliation failed or returned an invalid outcome.",
				);
			}
		},

		async markOperationNeedsAttention(id, reason) {
			const operationId = identifierSchema.parse(id);
			const parsedReason = z.string().trim().min(1).max(500).parse(reason);
			return transact(async (transaction) => {
				await lock(transaction, "paymentOperationLockV2", operationId);
				const operation = requireOperation(
					await transaction.getForUpdate("paymentOperationV2", operationId),
				);
				if (!["running", "ambiguous"].includes(operation.state)) {
					throw new PaymentConnectionError(
						"invalid_operation_state",
						"Only a running or ambiguous Payment operation can require attention.",
					);
				}
				const now = new Date();
				const updated = operationRecord(operation, {
					state: "needs_attention",
					needsAttentionReason: parsedReason,
					needsAttentionAt: now,
					updatedAt: now,
				});
				await transaction.upsert("paymentOperationV2", operationId, updated);
				return updated;
			});
		},

		async getOperation(id) {
			const row = await data.get(
				"paymentOperationV2",
				identifierSchema.parse(id),
			);
			return row ? paymentOperationSchema.parse(row) : null;
		},

		async listOperationAttempts(id) {
			const operationId = identifierSchema.parse(id);
			const rows = await data.findMany("paymentOperationAttemptV2", {
				where: { paymentOperationId: operationId },
			});
			return rows
				.map((row) => paymentOperationAttemptSchema.parse(row))
				.sort((left, right) => left.attempt - right.attempt);
		},
	};
}
