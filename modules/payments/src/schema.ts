import type { ModuleSchema } from "@86d-app/core";

export const paymentsSchema = {
	paymentConnection: {
		fields: {
			id: { type: "string", required: true },
			name: { type: "string", required: true },
			normalizedName: { type: "string", required: true, index: true },
			provider: { type: "string", required: true },
			mode: { type: ["test", "live"], required: true },
			capabilities: { type: "json", required: true, defaultValue: [] },
			health: {
				type: ["unknown", "healthy", "degraded", "unhealthy"],
				required: true,
				defaultValue: "unknown",
			},
			lifecycle: {
				type: ["draft", "enabled", "disabled", "revoked"],
				required: true,
				defaultValue: "draft",
			},
			/** Opaque server-side locator. Never return this field from an endpoint. */
			secretReference: { type: "string", required: true },
			healthCheckedAt: { type: "date", required: false },
			enabledAt: { type: "date", required: false },
			disabledAt: { type: "date", required: false },
			revokedAt: { type: "date", required: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
	/** Stable row used to serialize Payment Connection names. */
	paymentConnectionLockV2: {
		fields: {
			id: { type: "string", required: true },
		},
	},
	/** Durable v2 operation aggregate. Routing and request identity are immutable. */
	paymentOperationV2: {
		fields: {
			id: { type: "string", required: true },
			paymentId: { type: "string", required: true, index: true },
			connectionId: { type: "string", required: true, index: true },
			sourceOperationId: { type: "string", required: false, index: true },
			operation: {
				type: ["intent", "authorization", "capture", "refund", "void"],
				required: true,
			},
			idempotencyKey: { type: "string", required: true, index: true },
			requestDigest: { type: "string", required: true },
			requestDigestVersion: {
				type: "number",
				required: true,
				defaultValue: 1,
			},
			state: {
				type: [
					"pending",
					"running",
					"succeeded",
					"failed",
					"ambiguous",
					"needs_attention",
				],
				required: true,
				defaultValue: "pending",
			},
			attempt: { type: "number", required: true, defaultValue: 1 },
			providerReference: { type: "string", required: false },
			outcome: { type: "json", required: false },
			needsAttentionReason: { type: "string", required: false },
			needsAttentionAt: { type: "date", required: false },
			completedAt: { type: "date", required: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
	/** Append-only attempt history; each row becomes final after its provider call. */
	paymentOperationAttemptV2: {
		fields: {
			id: { type: "string", required: true },
			paymentOperationId: { type: "string", required: true, index: true },
			connectionId: { type: "string", required: true, index: true },
			attempt: { type: "number", required: true },
			idempotencyKey: { type: "string", required: true, index: true },
			requestDigest: { type: "string", required: true },
			state: {
				type: ["running", "succeeded", "failed", "ambiguous"],
				required: true,
			},
			providerReference: { type: "string", required: false },
			outcome: { type: "json", required: false },
			startedAt: { type: "date", required: true },
			finishedAt: { type: "date", required: false },
		},
	},
	/** Stable row used to serialize one idempotent Payment operation. */
	paymentOperationLockV2: {
		fields: {
			id: { type: "string", required: true },
		},
	},
	paymentIntent: {
		fields: {
			id: { type: "string", required: true },
			/** Provider-assigned intent ID (e.g. Stripe's pi_xxx) */
			providerIntentId: { type: "string", required: false },
			customerId: { type: "string", required: false },
			email: { type: "string", required: false },
			/** Amount in smallest currency unit (e.g. cents) */
			amount: { type: "number", required: true },
			currency: { type: "string", required: true, defaultValue: "USD" },
			status: {
				type: [
					"pending",
					"processing",
					"succeeded",
					"failed",
					"cancelled",
					"refunded",
				],
				required: true,
				defaultValue: "pending",
			},
			paymentMethodId: { type: "string", required: false },
			orderId: { type: "string", required: false },
			checkoutSessionId: { type: "string", required: false },
			metadata: { type: "json", required: false, defaultValue: {} },
			providerMetadata: { type: "json", required: false, defaultValue: {} },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
	paymentMethod: {
		fields: {
			id: { type: "string", required: true },
			customerId: { type: "string", required: true },
			/** Provider-assigned method ID (e.g. Stripe's pm_xxx) */
			providerMethodId: { type: "string", required: true },
			/** card | bank_transfer | wallet */
			type: { type: "string", required: true, defaultValue: "card" },
			last4: { type: "string", required: false },
			brand: { type: "string", required: false },
			expiryMonth: { type: "number", required: false },
			expiryYear: { type: "number", required: false },
			isDefault: { type: "boolean", required: true, defaultValue: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
	refund: {
		fields: {
			id: { type: "string", required: true },
			paymentIntentId: { type: "string", required: true },
			/** Provider-assigned refund ID */
			providerRefundId: { type: "string", required: true },
			/** Refund amount in smallest currency unit */
			amount: { type: "number", required: true },
			reason: { type: "string", required: false },
			status: {
				type: ["pending", "succeeded", "failed"],
				required: true,
				defaultValue: "pending",
			},
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
