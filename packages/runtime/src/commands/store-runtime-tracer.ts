import { z } from "zod";
import { defineCommand } from "../command";

export interface StoreRuntimeTracerTransaction {
	get(key: string): string | null;
	set(key: string, value: string): void;
}

/**
 * Small Store-owned Command used to prove the production Command path without
 * requiring a Control Plane, transport, or cross-plane persistence service.
 */
export const storeRuntimeTracerCommand =
	defineCommand<StoreRuntimeTracerTransaction>()({
		command: { name: "store_runtime.tracer.write", version: 1 },
		ownerPlane: "store_runtime",
		targetType: "store",
		actionLevel: "automatic",
		inputSchema: z
			.object({
				value: z.string().min(1).max(100),
			})
			.strict(),
		resultSchema: z
			.object({
				previousValue: z.string().nullable(),
				value: z.string(),
				targetId: z.string(),
			})
			.strict(),
		execute: async ({ input, target, transaction }) => {
			const stateKey = `command:tracer:${target.id}`;
			const previousValue = transaction.get(stateKey);
			transaction.set(stateKey, input.value);
			return {
				ok: true,
				result: {
					previousValue,
					value: input.value,
					targetId: target.id,
				},
			};
		},
	});
