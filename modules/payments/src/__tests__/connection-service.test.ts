import type {
	ModuleDataService,
	ModuleDataTransaction,
	ModuleTransactionRunner,
	PaymentConnectionProvider,
	PaymentProviderOperationOutcome,
} from "@86d-app/core";
import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
	createPaymentConnectionController,
	PaymentConnectionError,
	paymentOperationExecutionInputSchema,
} from "../connection-service";

function transactionRunner(data: ModuleDataService, locking = true) {
	let queue = Promise.resolve();
	const transaction: ModuleDataTransaction = {
		get: data.get.bind(data),
		upsert: data.upsert.bind(data),
		delete: data.delete.bind(data),
		findMany: data.findMany.bind(data),
		async emit(definition, input) {
			return {
				id: crypto.randomUUID(),
				name: definition.name,
				version: definition.version,
				storeId: "store-1",
				sourceModule: definition.owner,
				aggregate: { ...input.aggregate, sequence: 1 },
				occurredAt: input.occurredAt ?? new Date(),
				payload: input.payload,
			};
		},
	};
	const lockingTransaction = {
		...transaction,
		getForUpdate: data.get.bind(data),
	};
	const active = locking ? lockingTransaction : transaction;
	const transactions: ModuleTransactionRunner = {
		transaction(work) {
			const result = queue.then(() => work(active));
			queue = result.then(
				() => undefined,
				() => undefined,
			);
			return result;
		},
	};
	return transactions;
}

function providerAdapter(options?: {
	connectionId?: string;
	provider?: string;
	capabilities?: PaymentConnectionProvider["capabilities"];
	execute?:
		| ((
				request: Parameters<PaymentConnectionProvider["execute"]>[0],
		  ) => Promise<PaymentProviderOperationOutcome>)
		| undefined;
	reconcile?:
		| ((
				request: Parameters<PaymentConnectionProvider["reconcile"]>[0],
		  ) => Promise<PaymentProviderOperationOutcome>)
		| undefined;
}) {
	const connectionId = options?.connectionId ?? "connection-1";
	const execute = vi.fn(
		options?.execute ??
			(async () => ({
				state: "succeeded" as const,
				providerReference: `provider-payment-${connectionId}`,
				result: { accepted: true },
			})),
	);
	const reconcile = vi.fn(
		options?.reconcile ??
			(async () => ({
				state: "succeeded" as const,
				providerReference: `provider-payment-${connectionId}`,
				result: { reconciled: true },
			})),
	);
	const adapter = {
		connectionId,
		provider: options?.provider ?? "test-provider",
		mode: "test" as const,
		capabilities: options?.capabilities ?? [
			"intent",
			"authorization",
			"capture",
			"refund",
			"void",
		],
		execute,
		reconcile,
	} satisfies PaymentConnectionProvider;
	return { adapter, execute, reconcile };
}

function connectionInput(
	id = "connection-1",
	capabilities: PaymentConnectionProvider["capabilities"] = [
		"intent",
		"authorization",
		"capture",
		"refund",
		"void",
	],
) {
	return {
		id,
		name: id === "connection-1" ? "Primary Cards" : `Connection ${id}`,
		provider: "test-provider",
		mode: "test" as const,
		capabilities: [...capabilities],
		secretReference: `secret://${id}`,
	};
}

async function enableConnection(
	controller: ReturnType<typeof createPaymentConnectionController>,
	id = "connection-1",
	capabilities?: PaymentConnectionProvider["capabilities"],
) {
	await controller.createConnection(connectionInput(id, capabilities));
	await controller.setConnectionHealth(id, "healthy");
	return controller.enableConnection(id);
}

function intentInput(options?: {
	paymentId?: string;
	connectionId?: string;
	idempotencyKey?: string;
	amount?: number;
}) {
	return {
		paymentId: options?.paymentId ?? "payment-1",
		connectionId: options?.connectionId ?? "connection-1",
		idempotencyKey: options?.idempotencyKey ?? "create-intent-operation-1",
		payload: {
			operation: "intent" as const,
			amount: options?.amount ?? 1_000,
			currency: "USD",
		},
	};
}

describe("Payment Connections", () => {
	it("fails closed without transactional or locking storage", async () => {
		const data = createMockDataService();
		const missing = createPaymentConnectionController(data, undefined);
		const unlocked = createPaymentConnectionController(
			data,
			transactionRunner(data, false),
		);

		await expect(
			missing.createConnection(connectionInput()),
		).rejects.toMatchObject({ code: "transaction_unavailable" });
		await expect(
			unlocked.createConnection(connectionInput()),
		).rejects.toMatchObject({ code: "transaction_unavailable" });
	});

	it("normalizes names and prevents duplicate Connection selection ambiguity", async () => {
		const data = createMockDataService();
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
		);
		await controller.createConnection(connectionInput());

		await expect(
			controller.createConnection({
				...connectionInput("connection-2"),
				name: "primary cards",
			}),
		).rejects.toMatchObject({ code: "connection_name_conflict" });
		expect(await controller.listConnections()).toHaveLength(1);
	});

	it("requires a healthy, explicitly bound Connection before enablement", async () => {
		const data = createMockDataService();
		const intentOnly = providerAdapter({ capabilities: ["intent"] });
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
			[intentOnly.adapter],
		);
		await controller.createConnection(
			connectionInput("connection-1", ["intent", "refund"]),
		);
		await expect(
			controller.enableConnection("connection-1"),
		).rejects.toMatchObject({ code: "connection_not_usable" });
		await controller.setConnectionHealth("connection-1", "healthy");
		await expect(
			controller.enableConnection("connection-1"),
		).rejects.toMatchObject({ code: "provider_not_bound" });
	});

	it("fails an operation closed for a disabled, unhealthy, or revoked Connection", async () => {
		const data = createMockDataService();
		const provider = providerAdapter();
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
			[provider.adapter],
		);
		await controller.createConnection(connectionInput());
		const draft = await controller.executeOperation(intentInput());
		await controller.setConnectionHealth("connection-1", "healthy");
		await controller.enableConnection("connection-1");
		await controller.revokeConnection("connection-1");
		const revoked = await controller.executeOperation(
			intentInput({
				paymentId: "payment-2",
				idempotencyKey: "create-intent-operation-2",
			}),
		);

		expect(draft).toMatchObject({
			state: "failed",
			outcome: { reason: "connection_not_usable" },
		});
		expect(revoked).toMatchObject({
			state: "failed",
			connectionId: "connection-1",
			outcome: { reason: "connection_not_usable" },
		});
		expect(provider.execute).not.toHaveBeenCalled();
		await expect(
			controller.setConnectionHealth("connection-1", "healthy"),
		).rejects.toMatchObject({ code: "connection_revoked" });
	});

	it("disables an enabled Connection when its secret reference rotates", async () => {
		const data = createMockDataService();
		const provider = providerAdapter();
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
			[provider.adapter],
		);
		await enableConnection(controller);
		const rotated = await controller.rotateSecretReference(
			"connection-1",
			"secret://rotated",
		);

		expect(rotated).toMatchObject({
			lifecycle: "disabled",
			health: "unknown",
			secretReference: "secret://rotated",
		});
	});

	it("rejects multiple provider adapters bound to the same Connection", () => {
		const data = createMockDataService();
		const first = providerAdapter();
		const second = providerAdapter();

		expect(() =>
			createPaymentConnectionController(data, transactionRunner(data), [
				first.adapter,
				second.adapter,
			]),
		).toThrow(expect.objectContaining({ code: "provider_not_bound" }));
	});
});

describe("connection-bound Payment operations", () => {
	it("replays the same operation after restart and rejects changed same-key input", async () => {
		const data = createMockDataService();
		const provider = providerAdapter();
		const transactions = transactionRunner(data);
		const firstController = createPaymentConnectionController(
			data,
			transactions,
			[provider.adapter],
		);
		await enableConnection(firstController);
		const first = await firstController.executeOperation(intentInput());
		const restarted = createPaymentConnectionController(data, transactions, [
			provider.adapter,
		]);
		const replay = await restarted.executeOperation(intentInput());

		expect(first).toMatchObject({
			state: "succeeded",
			connectionId: "connection-1",
			attempt: 1,
		});
		expect(replay).toEqual(first);
		expect(provider.execute).toHaveBeenCalledTimes(1);
		await expect(
			restarted.executeOperation(intentInput({ amount: 1_001 })),
		).rejects.toMatchObject({ code: "idempotency_conflict" });
	});

	it("persists an ambiguous provider timeout and reconciles it after restart", async () => {
		const data = createMockDataService();
		const provider = providerAdapter({
			execute: async () => {
				throw new Error("provider timed out");
			},
			reconcile: async () => ({
				state: "succeeded",
				providerReference: "provider-payment-1",
				result: { reconciled: true },
			}),
		});
		const transactions = transactionRunner(data);
		const controller = createPaymentConnectionController(data, transactions, [
			provider.adapter,
		]);
		await enableConnection(controller);
		const ambiguous = await controller.executeOperation(intentInput());
		const restarted = createPaymentConnectionController(data, transactions, [
			provider.adapter,
		]);
		const reconciled = await restarted.reconcileOperation(ambiguous.id);
		const attempts = await restarted.listOperationAttempts(ambiguous.id);

		expect(ambiguous).toMatchObject({
			state: "ambiguous",
			outcome: { reason: "provider_outcome_unknown" },
		});
		expect(reconciled).toMatchObject({
			state: "succeeded",
			providerReference: "provider-payment-1",
			attempt: 2,
		});
		expect(attempts.map(({ state }) => state)).toEqual([
			"ambiguous",
			"succeeded",
		]);
	});

	it("marks an unresolved reconciliation as needs_attention", async () => {
		const data = createMockDataService();
		const provider = providerAdapter({
			execute: async () => ({ state: "ambiguous" }),
			reconcile: async () => ({ state: "ambiguous" }),
		});
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
			[provider.adapter],
		);
		await enableConnection(controller);
		const ambiguous = await controller.executeOperation(intentInput());
		const result = await controller.reconcileOperation(ambiguous.id);

		expect(result).toMatchObject({
			state: "needs_attention",
			needsAttentionReason:
				"Provider reconciliation did not establish a final outcome.",
		});
	});

	it("routes equal partial refunds through the original immutable Connection", async () => {
		const data = createMockDataService();
		const original = providerAdapter({
			connectionId: "connection-1",
			execute: async (request) => ({
				state: "succeeded",
				providerReference:
					request.payload.operation === "refund"
						? `refund-${request.operationId}`
						: "authorization-reference",
			}),
		});
		const other = providerAdapter({ connectionId: "connection-2" });
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
			[original.adapter, other.adapter],
		);
		await enableConnection(controller, "connection-1");
		await enableConnection(controller, "connection-2");
		const authorization = await controller.executeOperation({
			paymentId: "payment-1",
			connectionId: "connection-1",
			idempotencyKey: "authorize-payment-1",
			payload: { operation: "authorization", amount: 1_000, currency: "USD" },
		});
		const refundInput = (idempotencyKey: string) => ({
			paymentId: "payment-1",
			sourceOperationId: authorization.id,
			idempotencyKey,
			payload: {
				operation: "refund" as const,
				amount: 250,
				currency: "USD",
				providerPaymentReference: "authorization-reference",
			},
		});
		const first = await controller.executeOperation(
			refundInput("partial-refund-operation-1"),
		);
		const second = await controller.executeOperation(
			refundInput("partial-refund-operation-2"),
		);

		expect(first).toMatchObject({
			state: "succeeded",
			connectionId: "connection-1",
			sourceOperationId: authorization.id,
			operation: "refund",
		});
		expect(second).toMatchObject({
			state: "succeeded",
			connectionId: "connection-1",
		});
		expect(second.id).not.toBe(first.id);
		expect(original.execute).toHaveBeenCalledTimes(3);
		expect(other.execute).not.toHaveBeenCalled();
	});

	it("rejects a reversal with a substituted provider reference", async () => {
		const data = createMockDataService();
		const provider = providerAdapter({
			execute: async () => ({
				state: "succeeded",
				providerReference: "original-provider-reference",
			}),
		});
		const controller = createPaymentConnectionController(
			data,
			transactionRunner(data),
			[provider.adapter],
		);
		await enableConnection(controller);
		const source = await controller.executeOperation(intentInput());

		await expect(
			controller.executeOperation({
				paymentId: "payment-1",
				sourceOperationId: source.id,
				idempotencyKey: "refund-substituted-reference",
				payload: {
					operation: "refund",
					amount: 100,
					currency: "USD",
					providerPaymentReference: "different-provider-reference",
				},
			}),
		).rejects.toMatchObject({ code: "invalid_operation_state" });
		expect(provider.execute).toHaveBeenCalledTimes(1);
	});

	it("does not model a zero-total Checkout as a provider Payment", () => {
		expect(
			paymentOperationExecutionInputSchema.safeParse(
				intentInput({ amount: 0 }),
			),
		).toMatchObject({ success: false });
	});
});

it("exposes stable typed Payment Connection errors", () => {
	const error = new PaymentConnectionError("operation_not_found", "missing");
	expect(error).toMatchObject({
		name: "PaymentConnectionError",
		code: "operation_not_found",
		message: "missing",
	});
});
