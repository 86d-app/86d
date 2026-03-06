/**
 * Email notification handlers for store events.
 *
 * Subscribes to module events (order placed, shipped, cancelled,
 * delivered, refunded, return approved, payment failed) and sends
 * transactional emails via Resend. Handlers are registered once
 * on the shared EventBus after the module registry boots.
 */

import type { EventBus, ModuleEvent } from "@86d-app/core";
import BackInStockEmail from "emails/back-in-stock";
import DeliveryConfirmationEmail from "emails/delivery-confirmation";
import LowStockAlertEmail from "emails/low-stock-alert";
import OrderCancelledEmail from "emails/order-cancelled";
import OrderCompletedEmail from "emails/order-completed";
import OrderConfirmationEmail from "emails/order-confirmation";
import PaymentFailedEmail from "emails/payment-failed";
import RefundProcessedEmail from "emails/refund-processed";
import ReturnApprovedEmail from "emails/return-approved";
import ReviewRequestEmail from "emails/review-request";
import ShippingNotificationEmail from "emails/shipping-notification";
import SubscriptionCancelEmail from "emails/subscription-cancel";
import SubscriptionCompleteEmail from "emails/subscription-complete";
import SubscriptionUpdateEmail from "emails/subscription-update";
import WelcomeEmail from "emails/welcome";
import { getTrackingUrl } from "lib/carrier-tracking";
import { logger } from "utils/logger";

/**
 * Minimal interface for the Resend email client.
 * Avoids a direct dependency on the `resend` package in the store app.
 */
interface EmailClient {
	emails: {
		send(params: {
			from: string;
			to: string[];
			subject: string;
			react: React.ReactElement;
		}): Promise<unknown>;
	};
}

// ── Event payload types ──────────────────────────────────────────────

export interface CheckoutCompletedPayload {
	sessionId: string;
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	items: Array<{ name: string; quantity: number; price: number }>;
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	total: number;
	currency: string;
	shippingAddress?:
		| {
				firstName: string;
				lastName: string;
				line1: string;
				line2?: string | undefined;
				city: string;
				state: string;
				postalCode: string;
				country: string;
		  }
		| undefined;
}

export interface OrderShippedPayload {
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	trackingNumber?: string | undefined;
	trackingUrl?: string | undefined;
	carrier?: string | undefined;
}

export interface OrderFulfilledPayload {
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
}

export interface OrderCancelledPayload {
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	reason?: string | undefined;
}

export interface PaymentRefundedPayload {
	paymentIntentId: string;
	refundId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	refundAmount: number;
	currency: string;
	items?: Array<{ name: string; quantity: number; price: number }> | undefined;
	reason?: string | undefined;
}

export interface ShipmentDeliveredPayload {
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	deliveredAt?: string | undefined;
	reviewUrl?: string | undefined;
}

export interface ReturnApprovedPayload {
	orderId: string;
	orderNumber: string;
	returnId: string;
	email: string;
	customerName: string;
	items?: string[] | undefined;
	instructions?: string | undefined;
}

export interface PaymentFailedPayload {
	paymentIntentId: string;
	orderNumber?: string | undefined;
	email: string;
	customerName: string;
	amount?: number | undefined;
	currency?: string | undefined;
	reason?: string | undefined;
	retryUrl?: string | undefined;
}

export interface InventoryLowPayload {
	productId: string;
	variantId?: string | undefined;
	locationId?: string | undefined;
	quantity: number;
	reserved: number;
	available: number;
	lowStockThreshold: number;
}

export interface BackInStockPayload {
	productId: string;
	variantId?: string | undefined;
	available: number;
	subscribers: Array<{
		email: string;
		productName?: string | undefined;
	}>;
}

export interface ReviewRequestedPayload {
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	items: Array<{
		productId: string;
		name: string;
		reviewUrl?: string | undefined;
	}>;
	storeName?: string | undefined;
	storeUrl?: string | undefined;
}

export interface SubscriptionCreatedPayload {
	subscriptionId: string;
	planId: string;
	planName: string;
	email: string;
	customerId?: string | undefined;
	status: string;
	interval: string;
	price: number;
	currency: string;
}

export interface SubscriptionRenewedPayload {
	subscriptionId: string;
	planId: string;
	planName: string;
	email: string;
	customerId?: string | undefined;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
}

export interface SubscriptionCancelledPayload {
	subscriptionId: string;
	planId: string;
	email: string;
	customerId?: string | undefined;
	cancelledAt?: Date | undefined;
}

export interface CustomerCreatedPayload {
	customerId: string;
	email: string;
	firstName: string;
	lastName: string;
}

// ── Configuration ────────────────────────────────────────────────────

export interface NotificationConfig {
	/** "From" address for emails (e.g., "Store Name <orders@86d.app>") */
	fromAddress: string;
	/** Store name shown in email footers */
	storeName: string;
	/** Admin email for operational alerts (low stock, etc.). If not set, alerts are skipped. */
	adminEmail?: string | undefined;
	/** URL prefix for the store admin (e.g., "https://store.example.com/admin") */
	adminUrl?: string | undefined;
}

const DEFAULT_CONFIG: NotificationConfig = {
	fromAddress: "86d Store <orders@86d.app>",
	storeName: "86d Store",
};

// ── Handlers ─────────────────────────────────────────────────────────

function createCheckoutCompletedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<CheckoutCompletedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn(
				"checkout.completed: no email address, skipping notification",
				{
					sessionId: p.sessionId,
				},
			);
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Order Confirmed - ${p.orderNumber}`,
			react: OrderConfirmationEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				items: p.items,
				subtotal: p.subtotal,
				taxAmount: p.taxAmount,
				shippingAmount: p.shippingAmount,
				discountAmount: p.discountAmount,
				total: p.total,
				currency: p.currency,
				shippingAddress: p.shippingAddress,
				storeName: config.storeName,
			}),
		});

		logger.info("Order confirmation email sent", {
			orderNumber: p.orderNumber,
			to: p.email,
		});
	};
}

function createOrderShippedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<OrderShippedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("order.shipped: no email address, skipping notification", {
				orderId: p.orderId,
			});
			return;
		}

		// Auto-generate tracking URL from carrier + tracking number if not provided
		let trackingUrl = p.trackingUrl;
		if (!trackingUrl && p.carrier && p.trackingNumber) {
			trackingUrl = getTrackingUrl(p.carrier, p.trackingNumber) ?? undefined;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Your Order Has Shipped - ${p.orderNumber}`,
			react: ShippingNotificationEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				trackingNumber: p.trackingNumber,
				trackingUrl,
				carrier: p.carrier,
				storeName: config.storeName,
			}),
		});

		logger.info("Shipping notification email sent", {
			orderNumber: p.orderNumber,
			to: p.email,
		});
	};
}

function createOrderFulfilledHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<OrderFulfilledPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("order.fulfilled: no email address, skipping notification", {
				orderId: p.orderId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Your Order is Complete - ${p.orderNumber}`,
			react: OrderCompletedEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				storeName: config.storeName,
			}),
		});

		logger.info("Order completed email sent", {
			orderNumber: p.orderNumber,
			to: p.email,
		});
	};
}

function createOrderCancelledHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<OrderCancelledPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("order.cancelled: no email address, skipping notification", {
				orderId: p.orderId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Order Cancelled - ${p.orderNumber}`,
			react: OrderCancelledEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				reason: p.reason,
				storeName: config.storeName,
			}),
		});

		logger.info("Order cancelled email sent", {
			orderNumber: p.orderNumber,
			to: p.email,
		});
	};
}

function createPaymentRefundedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<PaymentRefundedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("payment.refunded: no email address, skipping notification", {
				refundId: p.refundId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Refund Processed - ${p.orderNumber}`,
			react: RefundProcessedEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				refundAmount: p.refundAmount,
				currency: p.currency,
				items: p.items,
				reason: p.reason,
				storeName: config.storeName,
			}),
		});

		logger.info("Refund processed email sent", {
			orderNumber: p.orderNumber,
			refundId: p.refundId,
			to: p.email,
		});
	};
}

function createShipmentDeliveredHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<ShipmentDeliveredPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn(
				"shipment.delivered: no email address, skipping notification",
				{ orderId: p.orderId },
			);
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Your Order Has Been Delivered - ${p.orderNumber}`,
			react: DeliveryConfirmationEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				deliveredAt: p.deliveredAt,
				storeName: config.storeName,
				reviewUrl: p.reviewUrl,
			}),
		});

		logger.info("Delivery confirmation email sent", {
			orderNumber: p.orderNumber,
			to: p.email,
		});
	};
}

function createReturnApprovedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<ReturnApprovedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("return.approved: no email address, skipping notification", {
				returnId: p.returnId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Return Approved - ${p.orderNumber}`,
			react: ReturnApprovedEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				returnId: p.returnId,
				items: p.items,
				instructions: p.instructions,
				storeName: config.storeName,
			}),
		});

		logger.info("Return approved email sent", {
			orderNumber: p.orderNumber,
			returnId: p.returnId,
			to: p.email,
		});
	};
}

function createPaymentFailedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<PaymentFailedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("payment.failed: no email address, skipping notification", {
				paymentIntentId: p.paymentIntentId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Payment Failed${p.orderNumber ? ` - ${p.orderNumber}` : ""}`,
			react: PaymentFailedEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				amount: p.amount,
				currency: p.currency,
				reason: p.reason,
				retryUrl: p.retryUrl,
				storeName: config.storeName,
			}),
		});

		logger.info("Payment failed email sent", {
			paymentIntentId: p.paymentIntentId,
			to: p.email,
		});
	};
}

function createReviewRequestedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<ReviewRequestedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("review.requested: no email address, skipping notification", {
				orderId: p.orderId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `How Was Your Order? - ${p.orderNumber}`,
			react: ReviewRequestEmail({
				orderNumber: p.orderNumber,
				customerName: p.customerName,
				items: p.items.map((item) => ({
					name: item.name,
					reviewUrl: item.reviewUrl,
				})),
				storeName: p.storeName ?? config.storeName,
				storeUrl: p.storeUrl,
			}),
		});

		logger.info("Review request email sent", {
			orderNumber: p.orderNumber,
			to: p.email,
			itemCount: p.items.length,
		});
	};
}

function createInventoryLowHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<InventoryLowPayload>) => {
		if (!config.adminEmail) {
			logger.warn(
				"inventory.low: no adminEmail configured, skipping notification",
				{ productId: event.payload.productId },
			);
			return;
		}

		const p = event.payload;
		const inventoryUrl = config.adminUrl
			? `${config.adminUrl}/inventory`
			: undefined;

		await resend.emails.send({
			from: config.fromAddress,
			to: [config.adminEmail],
			subject: `Low Stock Alert - ${p.productId}${p.available === 0 ? " (Out of Stock)" : ""}`,
			react: LowStockAlertEmail({
				items: [
					{
						productId: p.productId,
						productName: p.productId,
						quantity: p.quantity,
						reserved: p.reserved,
						available: p.available,
						lowStockThreshold: p.lowStockThreshold,
					},
				],
				storeName: config.storeName,
				adminUrl: inventoryUrl,
			}),
		});

		logger.info("Low stock alert email sent", {
			productId: p.productId,
			available: p.available,
			threshold: p.lowStockThreshold,
			to: config.adminEmail,
		});
	};
}

function createBackInStockHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<BackInStockPayload>) => {
		const p = event.payload;
		if (!p.subscribers || p.subscribers.length === 0) {
			return;
		}

		let sent = 0;
		for (const sub of p.subscribers) {
			const productName = sub.productName ?? p.productId;
			await resend.emails.send({
				from: config.fromAddress,
				to: [sub.email],
				subject: `Back in Stock: ${productName}`,
				react: BackInStockEmail({
					productName,
					storeName: config.storeName,
				}),
			});
			sent++;
		}

		logger.info("Back-in-stock notification emails sent", {
			productId: p.productId,
			subscriberCount: sent,
		});
	};
}

function createSubscriptionCreatedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<SubscriptionCreatedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn(
				"subscription.created: no email address, skipping notification",
				{ subscriptionId: p.subscriptionId },
			);
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Subscription Confirmed - ${p.planName}`,
			react: SubscriptionCompleteEmail({
				storeName: config.storeName,
			}),
		});

		logger.info("Subscription confirmation email sent", {
			subscriptionId: p.subscriptionId,
			planName: p.planName,
			to: p.email,
		});
	};
}

function createSubscriptionRenewedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<SubscriptionRenewedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn(
				"subscription.renewed: no email address, skipping notification",
				{ subscriptionId: p.subscriptionId },
			);
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Subscription Renewed - ${p.planName}`,
			react: SubscriptionUpdateEmail({
				storeName: config.storeName,
			}),
		});

		logger.info("Subscription renewed email sent", {
			subscriptionId: p.subscriptionId,
			planName: p.planName,
			to: p.email,
		});
	};
}

function createSubscriptionCancelledHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<SubscriptionCancelledPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn(
				"subscription.cancelled: no email address, skipping notification",
				{ subscriptionId: p.subscriptionId },
			);
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: "Subscription Cancelled",
			react: SubscriptionCancelEmail({
				storeName: config.storeName,
			}),
		});

		logger.info("Subscription cancelled email sent", {
			subscriptionId: p.subscriptionId,
			to: p.email,
		});
	};
}

function createCustomerCreatedHandler(
	resend: EmailClient,
	config: NotificationConfig,
) {
	return async (event: ModuleEvent<CustomerCreatedPayload>) => {
		const p = event.payload;
		if (!p.email) {
			logger.warn("customer.created: no email address, skipping notification", {
				customerId: p.customerId,
			});
			return;
		}

		await resend.emails.send({
			from: config.fromAddress,
			to: [p.email],
			subject: `Welcome to ${config.storeName}!`,
			react: WelcomeEmail({
				storeName: config.storeName,
			}),
		});

		logger.info("Welcome email sent", {
			customerId: p.customerId,
			to: p.email,
		});
	};
}

// ── Registration ─────────────────────────────────────────────────────

/**
 * Register all email notification handlers on the event bus.
 * Should be called once after the module registry boots.
 *
 * @param enabledEvents - Set of event types that are enabled. When undefined, all events are enabled.
 * Returns an unsubscribe function to remove all handlers.
 */
export function registerNotificationHandlers(
	bus: EventBus,
	resend: EmailClient,
	config?: Partial<NotificationConfig> | undefined,
	enabledEvents?: Set<string> | undefined,
): () => void {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };

	// biome-ignore lint/suspicious/noExplicitAny: each handler has a specific ModuleEvent<T> type but we store them together
	const handlers: Array<[string, any]> = [
		[
			"checkout.completed",
			createCheckoutCompletedHandler(resend, mergedConfig),
		],
		["inventory.low", createInventoryLowHandler(resend, mergedConfig)],
		["order.shipped", createOrderShippedHandler(resend, mergedConfig)],
		["order.fulfilled", createOrderFulfilledHandler(resend, mergedConfig)],
		["order.cancelled", createOrderCancelledHandler(resend, mergedConfig)],
		["payment.refunded", createPaymentRefundedHandler(resend, mergedConfig)],
		[
			"shipment.delivered",
			createShipmentDeliveredHandler(resend, mergedConfig),
		],
		["return.approved", createReturnApprovedHandler(resend, mergedConfig)],
		["payment.failed", createPaymentFailedHandler(resend, mergedConfig)],
		["inventory.back-in-stock", createBackInStockHandler(resend, mergedConfig)],
		["review.requested", createReviewRequestedHandler(resend, mergedConfig)],
		[
			"subscription.created",
			createSubscriptionCreatedHandler(resend, mergedConfig),
		],
		[
			"subscription.renewed",
			createSubscriptionRenewedHandler(resend, mergedConfig),
		],
		[
			"subscription.cancelled",
			createSubscriptionCancelledHandler(resend, mergedConfig),
		],
		["customer.created", createCustomerCreatedHandler(resend, mergedConfig)],
	];

	const registeredEvents: string[] = [];
	const unsubs: Array<() => void> = [];

	for (const [event, handler] of handlers) {
		if (enabledEvents && !enabledEvents.has(event)) {
			continue;
		}
		unsubs.push(bus.on(event, handler));
		registeredEvents.push(event);
	}

	logger.info("Email notification handlers registered", {
		events: registeredEvents,
		skipped: enabledEvents ? handlers.length - registeredEvents.length : 0,
	});

	return () => {
		for (const unsub of unsubs) {
			unsub();
		}
	};
}
