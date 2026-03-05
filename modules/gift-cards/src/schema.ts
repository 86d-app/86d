import type { ModuleSchema } from "@86d-app/core";

export const giftCardSchema = {
	giftCard: {
		fields: {
			id: { type: "string", required: true },
			/** Unique redemption code (uppercase alphanumeric, e.g. GIFT-XXXX-XXXX) */
			code: { type: "string", required: true },
			initialBalance: { type: "number", required: true },
			currentBalance: { type: "number", required: true },
			currency: { type: "string", required: true },
			/** active | disabled | expired | depleted */
			status: { type: "string", required: true },
			expiresAt: { type: "string", required: false },
			/** Customer who received the gift card */
			recipientEmail: { type: "string", required: false },
			/** Customer ID if linked to an account */
			customerId: { type: "string", required: false },
			/** Order that purchased this gift card */
			purchaseOrderId: { type: "string", required: false },
			/** Admin note for manual issuances */
			note: { type: "string", required: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
	giftCardTransaction: {
		fields: {
			id: { type: "string", required: true },
			giftCardId: { type: "string", required: true },
			/** debit (redemption) or credit (refund/topup) */
			type: { type: "string", required: true },
			amount: { type: "number", required: true },
			balanceAfter: { type: "number", required: true },
			/** Order that triggered this transaction */
			orderId: { type: "string", required: false },
			note: { type: "string", required: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
