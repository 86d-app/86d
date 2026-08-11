import { z } from "zod";

export type JsonValue =
	| boolean
	| null
	| number
	| string
	| JsonValue[]
	| { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number().finite(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
);

const identifierSchema = z.string().min(1).max(255);
const versionSchema = z.number().int().positive();
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const dateTimeSchema = z.string().datetime();
const permissionSchema = z.string().min(1).max(200);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const minorAmountSchema = z.string().regex(/^\d+$/);

export const authoritativePlaneSchema = z.enum([
	"control_plane",
	"store_runtime",
]);
export type AuthoritativePlane = z.infer<typeof authoritativePlaneSchema>;

export const actionLevelSchema = z.enum([
	"automatic",
	"approve",
	"confirm_now",
]);
export type ActionLevel = z.infer<typeof actionLevelSchema>;

export const commandReferenceSchema = z
	.object({
		name: z
			.string()
			.min(3)
			.max(200)
			.regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/),
		version: versionSchema,
	})
	.strict();
export type CommandReference = z.infer<typeof commandReferenceSchema>;

export const targetReferenceSchema = z
	.object({
		type: z.enum([
			"account",
			"business",
			"store",
			"connection",
			"resource",
			"workflow",
		]),
		id: identifierSchema,
	})
	.strict();
export type TargetReference = z.infer<typeof targetReferenceSchema>;

export const actorReferenceSchema = z
	.object({
		type: z.enum(["account", "workload", "system"]),
		id: identifierSchema,
	})
	.strict();
export type ActorReference = z.infer<typeof actorReferenceSchema>;

export const authoritySnapshotSchema = z
	.object({
		id: identifierSchema,
		type: z.enum([
			"account_owner",
			"business_membership",
			"store_membership",
			"custom_role",
			"standing_permission",
			"workload_grant",
			"system_grant",
		]),
		role: z.string().min(1).max(100).optional(),
		permissions: z.array(permissionSchema).max(250),
		businessId: identifierSchema.optional(),
		storeId: identifierSchema.optional(),
	})
	.strict();
export type AuthoritySnapshot = z.infer<typeof authoritySnapshotSchema>;

export const commandRequestSchema = z
	.object({
		command: commandReferenceSchema,
		idempotencyKey: z.string().min(8).max(200),
		target: targetReferenceSchema,
		input: jsonValueSchema,
		approvalReference: identifierSchema.optional(),
		confirmationReference: identifierSchema.optional(),
	})
	.strict();
export type CommandRequest = z.infer<typeof commandRequestSchema>;

export const commandFailureCodeSchema = z.enum([
	"invalid_request",
	"unknown_command",
	"unauthenticated",
	"forbidden",
	"target_not_found",
	"invalid_input",
	"idempotency_conflict",
	"approval_required",
	"approval_invalid",
	"confirmation_required",
	"confirmation_invalid",
	"standing_permission_exhausted",
	"invalid_result",
	"execution_failed",
	"temporarily_unavailable",
]);
export type CommandFailureCode = z.infer<typeof commandFailureCodeSchema>;

export const commandFailureSchema = z
	.object({
		code: commandFailureCodeSchema,
		message: z.string().min(1).max(500),
		retryable: z.boolean(),
		details: jsonValueSchema.optional(),
	})
	.strict();
export type CommandFailure = z.infer<typeof commandFailureSchema>;

export const commandStatusSchema = z.enum([
	"pending",
	"running",
	"succeeded",
	"failed",
]);
export type CommandStatus = z.infer<typeof commandStatusSchema>;

const commandReceiptBaseSchema = z.object({
	executionId: identifierSchema,
	command: commandReferenceSchema,
	target: targetReferenceSchema,
	idempotencyKey: z.string().min(8).max(200),
	actionLevel: actionLevelSchema,
	replayed: z.boolean(),
	startedAt: dateTimeSchema,
});

export const commandReceiptSchema = z.discriminatedUnion("status", [
	commandReceiptBaseSchema
		.extend({
			status: z.literal("pending"),
		})
		.strict(),
	commandReceiptBaseSchema
		.extend({
			status: z.literal("running"),
		})
		.strict(),
	commandReceiptBaseSchema
		.extend({
			status: z.literal("succeeded"),
			completedAt: dateTimeSchema,
			result: jsonValueSchema,
		})
		.strict(),
	commandReceiptBaseSchema
		.extend({
			status: z.literal("failed"),
			completedAt: dateTimeSchema,
			failure: commandFailureSchema,
		})
		.strict(),
]);
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;

export const commandExecutionResponseSchema = z.discriminatedUnion("ok", [
	z
		.object({
			ok: z.literal(true),
			receipt: commandReceiptSchema,
		})
		.strict(),
	z
		.object({
			ok: z.literal(false),
			failure: commandFailureSchema,
			receipt: commandReceiptSchema.optional(),
		})
		.strict(),
]);
export type CommandExecutionResponse = z.infer<
	typeof commandExecutionResponseSchema
>;

export const workflowStateSchema = z.enum([
	"pending",
	"running",
	"completed",
	"rolled_back",
	"failed",
	"needs_attention",
]);
export type WorkflowState = z.infer<typeof workflowStateSchema>;

export const workflowSchema = z
	.object({
		id: identifierSchema,
		version: versionSchema,
		name: commandReferenceSchema.shape.name,
		state: workflowStateSchema,
		target: targetReferenceSchema,
		commandExecutionId: identifierSchema.optional(),
		currentStep: z.string().min(1).max(200).optional(),
		failure: commandFailureSchema.optional(),
		createdAt: dateTimeSchema,
		updatedAt: dateTimeSchema,
		completedAt: dateTimeSchema.optional(),
	})
	.strict();
export type Workflow = z.infer<typeof workflowSchema>;

export const workflowStepSchema = z
	.object({
		id: identifierSchema,
		workflowId: identifierSchema,
		name: z.string().min(1).max(200),
		position: z.number().int().nonnegative(),
		state: workflowStateSchema,
		providerReference: z.string().min(1).max(500).optional(),
		failure: commandFailureSchema.optional(),
		leaseOwner: z.string().min(1).max(255).optional(),
		leaseExpiresAt: dateTimeSchema.optional(),
		createdAt: dateTimeSchema,
		updatedAt: dateTimeSchema,
	})
	.strict();
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const workflowAttemptSchema = z
	.object({
		id: identifierSchema,
		stepId: identifierSchema,
		attempt: z.number().int().positive(),
		state: z.enum(["pending", "running", "succeeded", "failed", "ambiguous"]),
		operationKey: z.string().min(1).max(500),
		providerReference: z.string().min(1).max(500).optional(),
		failure: commandFailureSchema.optional(),
		startedAt: dateTimeSchema,
		finishedAt: dateTimeSchema.optional(),
	})
	.strict();
export type WorkflowAttempt = z.infer<typeof workflowAttemptSchema>;

export const baseRevisionSchema = z
	.object({
		target: targetReferenceSchema,
		revision: z.string().min(1).max(255),
	})
	.strict();

export const estimatedChargeSchema = z
	.object({
		amount: minorAmountSchema,
		currency: currencySchema,
		description: z.string().min(1).max(500),
	})
	.strict();

export const changeSetSchema = z
	.object({
		id: identifierSchema,
		version: versionSchema,
		ownerPlane: authoritativePlaneSchema,
		status: z.enum(["draft", "approved", "conflicted", "applied", "failed"]),
		reviewHash: digestSchema,
		baseRevisions: z.array(baseRevisionSchema).min(1).max(250),
		affectedTargets: z.array(targetReferenceSchema).min(1).max(250),
		beforeSummary: jsonValueSchema,
		afterSummary: jsonValueSchema,
		publicEffects: z.array(z.string().min(1).max(500)).max(250),
		operationalEffects: z.array(z.string().min(1).max(500)).max(250),
		estimatedCharges: z.array(estimatedChargeSchema).max(250),
		requiredPermissions: z.array(permissionSchema).max(250),
		validationBlocks: z.array(z.string().min(1).max(500)).max(250),
		rollbackCoverage: z.enum(["none", "database", "compensating", "full"]),
		createdAt: dateTimeSchema,
		updatedAt: dateTimeSchema,
		immutableAt: dateTimeSchema.optional(),
	})
	.strict();
export type ChangeSet = z.infer<typeof changeSetSchema>;

export const approvalSchema = z
	.object({
		id: identifierSchema,
		changeSetId: identifierSchema,
		reviewHash: digestSchema,
		baseRevisions: z.array(baseRevisionSchema).min(1).max(250),
		actor: actorReferenceSchema,
		authority: authoritySnapshotSchema,
		approvedAt: dateTimeSchema,
		invalidatedAt: dateTimeSchema.optional(),
	})
	.strict();
export type Approval = z.infer<typeof approvalSchema>;

export const confirmationSchema = z
	.object({
		id: identifierSchema,
		actor: actorReferenceSchema,
		sessionId: identifierSchema,
		target: targetReferenceSchema,
		bindingHash: digestSchema,
		nonceDigest: digestSchema,
		disclosure: z.string().min(1).max(2_000),
		amount: minorAmountSchema.optional(),
		currency: currencySchema.optional(),
		createdAt: dateTimeSchema,
		expiresAt: dateTimeSchema,
		consumedAt: dateTimeSchema.optional(),
	})
	.strict();
export type Confirmation = z.infer<typeof confirmationSchema>;

export const standingPermissionSchema = z
	.object({
		id: identifierSchema,
		grantee: actorReferenceSchema,
		businessId: identifierSchema,
		storeId: identifierSchema.optional(),
		action: commandReferenceSchema,
		validFrom: dateTimeSchema,
		validUntil: dateTimeSchema,
		perOperationAmount: minorAmountSchema.optional(),
		aggregateAmount: minorAmountSchema.optional(),
		currency: currencySchema.optional(),
		createdAt: dateTimeSchema,
		revokedAt: dateTimeSchema.optional(),
	})
	.strict();
export type StandingPermission = z.infer<typeof standingPermissionSchema>;

export const standingPermissionUseReservationSchema = z
	.object({
		id: identifierSchema,
		standingPermissionId: identifierSchema,
		commandExecutionId: identifierSchema,
		amount: minorAmountSchema,
		currency: currencySchema,
		state: z.enum(["reserved", "committed", "released", "ambiguous"]),
		createdAt: dateTimeSchema,
		updatedAt: dateTimeSchema,
	})
	.strict();
export type StandingPermissionUseReservation = z.infer<
	typeof standingPermissionUseReservationSchema
>;

export const auditEventSchema = z
	.object({
		id: identifierSchema,
		version: versionSchema,
		plane: authoritativePlaneSchema,
		type: z
			.string()
			.min(3)
			.max(200)
			.regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/),
		actor: actorReferenceSchema,
		authority: authoritySnapshotSchema,
		target: targetReferenceSchema,
		command: commandReferenceSchema.optional(),
		workflowId: identifierSchema.optional(),
		occurredAt: dateTimeSchema,
		data: jsonValueSchema,
	})
	.strict();
export type AuditEvent = z.infer<typeof auditEventSchema>;

const commandTransitions: Readonly<
	Record<CommandStatus, readonly CommandStatus[]>
> = {
	pending: ["running", "failed"],
	running: ["succeeded", "failed"],
	succeeded: [],
	failed: [],
};

const workflowTransitions: Readonly<
	Record<WorkflowState, readonly WorkflowState[]>
> = {
	pending: ["running", "failed"],
	running: ["completed", "rolled_back", "failed", "needs_attention"],
	completed: [],
	rolled_back: [],
	failed: ["running"],
	needs_attention: ["running", "failed", "rolled_back"],
};

export function canTransitionCommand(from: unknown, to: unknown): boolean {
	const parsedFrom = commandStatusSchema.safeParse(from);
	const parsedTo = commandStatusSchema.safeParse(to);
	return (
		parsedFrom.success &&
		parsedTo.success &&
		commandTransitions[parsedFrom.data].includes(parsedTo.data)
	);
}

export function canTransitionWorkflow(from: unknown, to: unknown): boolean {
	const parsedFrom = workflowStateSchema.safeParse(from);
	const parsedTo = workflowStateSchema.safeParse(to);
	return (
		parsedFrom.success &&
		parsedTo.success &&
		workflowTransitions[parsedFrom.data].includes(parsedTo.data)
	);
}
