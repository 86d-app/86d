import { acceptCapability } from "@86d-app/core/capabilities";
import {
	cartSnapshotCapability,
	discountCodeCapability,
	giftCardCheckoutCapability,
	inventoryCheckoutCapability,
	orderCreateCapability,
	paymentCheckoutCapability,
	priceListResolveCapability,
	productPriceConversionCapability,
	productResolveCapability,
	shippingQuoteCapability,
	storeCreditCheckoutCapability,
	taxQuoteCapability,
} from "@86d-app/core/commerce-capabilities";
import type {
	Module,
	ModuleConfig,
	ModuleContext,
} from "@86d-app/core/types/module";
import { adminEndpoints } from "./admin/endpoints/routes";
import { checkoutFinalizationLifecycleV1 } from "./finalization";
import { checkoutSchema } from "./schema";
import { createCheckoutController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints/routes";

export type {
	CheckoutRequest,
	CheckoutRequestCreateInput,
	CheckoutRequestCreateResult,
	CheckoutRequestInvitationState,
	CheckoutRequestReadResult,
	CheckoutRequestStore,
} from "./checkout-request";
export {
	checkoutRequestAuditActorSchema,
	checkoutRequestCartSnapshotSchema,
	checkoutRequestContactSchema,
	checkoutRequestCreateInputSchema,
	checkoutRequestReasonSchema,
	createCheckoutRequestStore,
} from "./checkout-request";
export type {
	AdmitCheckoutFinalizationInput,
	CheckoutFinalization,
	CheckoutFinalizationAttempt,
	CheckoutFinalizationCompensation,
	CheckoutFinalizationErrorCode,
	CheckoutFinalizationSnapshot,
	CheckoutFinalizationStore,
	RecordCheckoutFinalizationAttemptInput,
	RecordCheckoutFinalizationCompensationInput,
} from "./finalization";
export {
	admitCheckoutFinalizationInputSchema,
	CheckoutFinalizationError,
	checkoutFinalizationAcceptedInputSchema,
	checkoutFinalizationAttemptOutcomeSchema,
	checkoutFinalizationAttentionSchema,
	checkoutFinalizationCompensationActionSchema,
	checkoutFinalizationCompensationOutcomeSchema,
	checkoutFinalizationCompensationTargetSchema,
	checkoutFinalizationLifecycleV1,
	checkoutFinalizationResultSchema,
	checkoutFinalizationStateSchema,
	checkoutFinalizationStepSchema,
	createCheckoutFinalizationStore,
	recordCheckoutFinalizationAttemptInputSchema,
	recordCheckoutFinalizationCompensationInputSchema,
	storedCheckoutFinalizationAttemptSchema,
	storedCheckoutFinalizationCompensationSchema,
	storedCheckoutFinalizationSchema,
} from "./finalization";
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
 * Accepts required Product resolution and Order creation capabilities, plus
 * explicit optional capabilities for Inventory, Tax, Shipping, Discounts,
 * Gift Cards, Store Credits, Payments, Price Lists, and Multi-currency.
 * Providers remain authoritative and receive only their owner-scoped context.
 */
export default function checkout(options?: CheckoutOptions): Module {
	return {
		id: "checkout",
		version: "0.0.1",
		schema: checkoutSchema,
		capabilities: {
			accepts: [
				acceptCapability(cartSnapshotCapability),
				acceptCapability(productResolveCapability),
				acceptCapability(orderCreateCapability),
				acceptCapability(inventoryCheckoutCapability, {
					operations: ["check", "release"],
					optional: true,
				}),
				acceptCapability(taxQuoteCapability, { optional: true }),
				acceptCapability(shippingQuoteCapability, { optional: true }),
				acceptCapability(discountCodeCapability, {
					operations: ["validate"],
					optional: true,
				}),
				acceptCapability(giftCardCheckoutCapability, {
					operations: ["balance"],
					optional: true,
				}),
				acceptCapability(storeCreditCheckoutCapability, {
					operations: ["balance"],
					optional: true,
				}),
				acceptCapability(paymentCheckoutCapability, {
					operations: ["cancel"],
					optional: true,
				}),
				acceptCapability(priceListResolveCapability, { optional: true }),
				acceptCapability(productPriceConversionCapability, { optional: true }),
			],
		},
		exports: {
			read: ["checkoutStatus", "checkoutTotal", "checkoutLineItems"],
		},
		events: {
			emits: ["checkout.completed", "checkout.abandoned"],
		},
		durableEvents: { emits: [checkoutFinalizationLifecycleV1] },
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
			const controller = createCheckoutController(ctx.data, ctx.transactions);
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

		store: {
			pages: [
				{
					path: "/checkout",
					component: "CheckoutForm",
				},
				{
					path: "/checkout/confirmation",
					component: "OrderConfirmation",
				},
			],
		},

		options,
	};
}
