import type { ModuleSchema } from "@86d-app/core";

export const checkoutSchema = {
	checkoutSession: {
		fields: {
			id: { type: "string", required: true },
			cartId: { type: "string", required: false },
			customerId: { type: "string", required: false },
			guestEmail: { type: "string", required: false },
			status: {
				type: ["pending", "processing", "completed", "expired", "abandoned"],
				required: true,
				defaultValue: "pending",
			},
			subtotal: { type: "number", required: true },
			taxAmount: { type: "number", required: true, defaultValue: 0 },
			shippingAmount: { type: "number", required: true, defaultValue: 0 },
			discountAmount: { type: "number", required: true, defaultValue: 0 },
			/** Amount applied from a gift card */
			giftCardAmount: { type: "number", required: true, defaultValue: 0 },
			total: { type: "number", required: true },
			currency: { type: "string", required: true, defaultValue: "USD" },
			/** Validated promo code applied to this session */
			discountCode: { type: "string", required: false },
			/** Gift card code applied to this session */
			giftCardCode: { type: "string", required: false },
			/** JSON snapshot of shipping address */
			shippingAddress: { type: "json", required: false },
			/** JSON snapshot of billing address */
			billingAddress: { type: "json", required: false },
			/** Display name of the selected shipping method */
			shippingMethodName: { type: "string", required: false },
			/** Payment method identifier or token from provider */
			paymentMethod: { type: "string", required: false },
			/** Payment intent ID from the payments module */
			paymentIntentId: { type: "string", required: false },
			/** Current payment status (pending, processing, succeeded, failed) */
			paymentStatus: { type: "string", required: false },
			/** Order ID once checkout is completed */
			orderId: { type: "string", required: false },
			metadata: { type: "json", required: false, defaultValue: {} },
			expiresAt: { type: "date", required: true },
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
	checkoutLineItem: {
		fields: {
			id: { type: "string", required: true },
			sessionId: {
				type: "string",
				required: true,
				references: {
					model: "checkoutSession",
					field: "id",
					onDelete: "cascade",
				},
			},
			productId: { type: "string", required: true },
			variantId: { type: "string", required: false },
			name: { type: "string", required: true },
			sku: { type: "string", required: false },
			price: { type: "number", required: true },
			quantity: { type: "number", required: true, defaultValue: 1 },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
