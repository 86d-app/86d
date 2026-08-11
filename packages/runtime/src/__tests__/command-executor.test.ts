import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	type CommandAuthority,
	createCommandExecutor,
	createInMemoryCommandPersistence,
	defineCommand,
	type MemoryCommandTransaction,
} from "../command";

const fixedNow = new Date("2026-08-11T20:00:00.000Z");
const digestKey = "command-conformance-digest-key-0001";

function request(
	idempotencyKey: string,
	input: Record<string, boolean | string>,
) {
	return {
		command: { name: "store_runtime.tracer.write", version: 1 },
		idempotencyKey,
		target: { type: "store", id: "store-client-hint" },
		input,
	};
}

function principal(credentialId = "session-owner") {
	return {
		principal: {
			type: "session" as const,
			credentialId,
			sessionId: "session-human-present",
		},
	};
}

function createHarness(options?: {
	onSlowExecution?: (() => Promise<void>) | undefined;
}) {
	let executions = 0;
	let ids = 0;
	const persistence = createInMemoryCommandPersistence();
	const authority: CommandAuthority = {
		authorize: async ({ principal: serverPrincipal }) => {
			if (serverPrincipal.credentialId !== "session-owner") {
				return {
					ok: false,
					failure: {
						code: "forbidden",
						message: "The actor cannot use this target.",
						retryable: false,
					},
				};
			}
			return {
				ok: true,
				actor: { type: "account", id: "account-server-derived" },
				authority: {
					id: "membership-server-derived",
					type: "store_membership",
					role: "owner",
					permissions: ["store:update"],
					storeId: "store-authoritative",
				},
				target: { type: "store", id: "store-authoritative" },
			};
		},
		canRead: async ({ principal: serverPrincipal, execution }) =>
			serverPrincipal.credentialId === "session-owner" &&
			execution.actor.id === "account-server-derived",
	};
	const tracer = defineCommand<MemoryCommandTransaction>()({
		command: { name: "store_runtime.tracer.write", version: 1 },
		ownerPlane: "store_runtime",
		targetType: "store",
		actionLevel: "automatic",
		inputSchema: z
			.object({
				mode: z.enum(["write", "read", "fail"]),
				value: z.string().max(100).optional(),
				secret: z.string().max(100).optional(),
			})
			.strict(),
		resultSchema: z
			.object({
				value: z.string().nullable(),
				actorId: z.string(),
				targetId: z.string(),
			})
			.strict(),
		failureDetailsSchema: z.object({ reason: z.string().max(100) }).strict(),
		sensitiveInputPaths: ["secret"],
		execute: async ({ actor, input, target, transaction }) => {
			executions += 1;
			if (input.value === "slow") {
				await options?.onSlowExecution?.();
			}
			if (input.mode === "fail") {
				transaction.set("tracer:value", input.value ?? "changed-before-error");
				throw new Error("internal-canary-error");
			}
			if (input.mode === "write") {
				transaction.set("tracer:value", input.value ?? "");
			}
			return {
				ok: true,
				result: {
					value: transaction.get("tracer:value"),
					actorId: actor.id,
					targetId: target.id,
				},
			};
		},
	});
	const executor = createCommandExecutor({
		plane: "store_runtime",
		definitions: [tracer],
		authority,
		persistence,
		digestKey,
		clock: () => fixedNow,
		createId: (kind) => `${kind}-${++ids}`,
	});

	return {
		executor,
		get executions() {
			return executions;
		},
	};
}

describe("Store Runtime Command executor", () => {
	it("derives actor, authority, and target exclusively on the server", async () => {
		const harness = createHarness();
		const response = await harness.executor.execute(
			request("authority-001", { mode: "write", value: "alpha" }),
			principal(),
		);

		expect(response.ok).toBe(true);
		if (!response.ok || response.receipt.status !== "succeeded") return;
		expect(response.receipt.target.id).toBe("store-authoritative");
		expect(response.receipt.result).toEqual({
			value: "alpha",
			actorId: "account-server-derived",
			targetId: "store-authoritative",
		});

		const reconstruction = await harness.executor.get(
			response.receipt.executionId,
			principal(),
		);
		expect(reconstruction.ok).toBe(true);
		if (!reconstruction.ok) return;
		expect(reconstruction.execution.actor.id).toBe("account-server-derived");
		expect(reconstruction.execution.authority.id).toBe(
			"membership-server-derived",
		);
	});

	it("rejects request actor injection before authorization or execution", async () => {
		const harness = createHarness();
		const response = await harness.executor.execute(
			{
				...request("actor-injection-001", {
					mode: "write",
					value: "alpha",
				}),
				actor: { type: "account", id: "attacker-selected" },
			},
			principal(),
		);

		expect(response).toMatchObject({
			ok: false,
			failure: { code: "invalid_request", retryable: false },
		});
		expect(harness.executions).toBe(0);
	});

	it("executes concurrent identical requests once and replays the result", async () => {
		let release: (() => void) | undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let entered: (() => void) | undefined;
		const started = new Promise<void>((resolve) => {
			entered = resolve;
		});
		const harness = createHarness({
			onSlowExecution: async () => {
				entered?.();
				await gate;
			},
		});
		const command = request("concurrent-001", {
			mode: "write",
			value: "slow",
		});

		const first = harness.executor.execute(command, principal());
		await started;
		const second = harness.executor.execute(command, principal());
		release?.();
		const [firstResponse, secondResponse] = await Promise.all([first, second]);

		expect(firstResponse.ok).toBe(true);
		expect(secondResponse.ok).toBe(true);
		expect(harness.executions).toBe(1);
		if (!firstResponse.ok || !secondResponse.ok) return;
		expect(firstResponse.receipt.executionId).toBe(
			secondResponse.receipt.executionId,
		);
		expect(
			[firstResponse.receipt.replayed, secondResponse.receipt.replayed].sort(),
		).toEqual([false, true]);

		const replay = await harness.executor.execute(command, principal());
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		expect(replay.receipt.replayed).toBe(true);
		expect(harness.executions).toBe(1);
	});

	it("returns an idempotency conflict for the same key and different input", async () => {
		const harness = createHarness();
		await harness.executor.execute(
			request("conflict-001", { mode: "write", value: "alpha" }),
			principal(),
		);
		const response = await harness.executor.execute(
			request("conflict-001", { mode: "write", value: "beta" }),
			principal(),
		);

		expect(response).toMatchObject({
			ok: false,
			failure: { code: "idempotency_conflict", retryable: false },
		});
		expect(harness.executions).toBe(1);
	});

	it("rolls back local state when execution fails", async () => {
		const harness = createHarness();
		const failed = await harness.executor.execute(
			request("rollback-001", {
				mode: "fail",
				value: "must-not-commit",
			}),
			principal(),
		);
		expect(failed).toMatchObject({
			ok: false,
			failure: { code: "execution_failed" },
			receipt: { status: "failed" },
		});

		const read = await harness.executor.execute(
			request("rollback-read-001", { mode: "read" }),
			principal(),
		);
		expect(read.ok).toBe(true);
		if (!read.ok || read.receipt.status !== "succeeded") return;
		expect(read.receipt.result).toMatchObject({ value: null });
	});

	it("stores only keyed digests and redacted summaries for sensitive input", async () => {
		const harness = createHarness();
		const response = await harness.executor.execute(
			request("redaction-001", {
				mode: "write",
				value: "alpha",
				secret: "command-canary-secret",
			}),
			principal(),
		);
		expect(response.ok).toBe(true);
		if (!response.ok) return;

		const reconstruction = await harness.executor.get(
			response.receipt.executionId,
			principal(),
		);
		expect(reconstruction.ok).toBe(true);
		if (!reconstruction.ok) return;
		const serialized = JSON.stringify(reconstruction.execution);
		expect(serialized).not.toContain("command-canary-secret");
		expect(reconstruction.execution.redactedInput).toMatchObject({
			secret: "[REDACTED]",
		});
		expect(reconstruction.execution.inputDigest).toMatch(/^[a-f0-9]{64}$/);
		expect(
			reconstruction.execution.auditEvents.map((event) => event.type),
		).toEqual(["command.started", "command.succeeded"]);
		expect(Object.keys(harness.executor).sort()).toEqual(["execute", "get"]);
	});

	it("denies unauthorized actors without side effects", async () => {
		const harness = createHarness();
		const response = await harness.executor.execute(
			request("forbidden-001", { mode: "write", value: "alpha" }),
			principal("session-nonmember"),
		);

		expect(response).toMatchObject({
			ok: false,
			failure: { code: "forbidden" },
		});
		expect(harness.executions).toBe(0);
	});
});
