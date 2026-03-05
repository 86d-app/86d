import type { ModuleSchema } from "@86d-app/core";

export const paymentsSchema = {
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
