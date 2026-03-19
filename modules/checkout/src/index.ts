import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { checkoutSchema } from "./schema";
import { createCheckoutController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CheckoutAddress,
	CheckoutController,
	CheckoutLineItem,
	CheckoutSession,
	CheckoutStatus,
	DiscountController,
	GiftCardCheckController,
	InventoryCheckController,
	PaymentProcessController,
	ShippingRateController,
} from "./service";

export interface CheckoutOptions extends ModuleConfig {
	/**
	 * Session TTL in milliseconds
	 * @default 1800000 (30 minutes)
	 */
	sessionTtl?: number;
	/**
	 * Default currency code
	 * @default "USD"
	 */
	currency?: string;
}

/**
 * Checkout module factory.
 * Orchestrates the checkout flow: session creation → address collection →
 * discount application → inventory reservation → order completion.
 *
 * Integrates with the discounts module (optional) via runtime context.
 * Integrates with the inventory module (optional) for stock validation and reservation.
 * Integrates with the orders module (optional) via the complete() method caller.
 */
export default function checkout(options?: CheckoutOptions): Module {
	return {
		id: "checkout",
		version: "0.0.1",
		schema: checkoutSchema,
		exports: {
			read: ["checkoutStatus", "checkoutTotal", "checkoutLineItems"],
		},
		events: {
			emits: ["checkout.completed", "checkout.abandoned"],
		},
		requires: {
			discounts: {
				read: ["discountValidation", "discountAmount"],
				optional: true,
			},
			inventory: {
				read: ["stockQuantity", "stockAvailability"],
				optional: true,
			},
			"gift-cards": {
				read: ["giftCardBalance", "giftCardStatus"],
				optional: true,
			},
			payments: {
				read: ["paymentStatus", "paymentAmount"],
				optional: true,
			},
			shipping: {
				read: ["shippingRates", "shippingZones", "shippingMethods"],
				optional: true,
			},
		},

		init: async (ctx: ModuleContext) => {
			const controller = createCheckoutController(ctx.data);
			return {
				controllers: { checkout: controller },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},

		admin: {
			pages: [
				{
					path: "/admin/checkout",
					component: "CheckoutList",
					label: "Checkout",
					icon: "CreditCard",
					group: "Sales",
				},
				{ path: "/admin/checkout/:id", component: "CheckoutDetail" },
			],
		},

		options,
	};
}
