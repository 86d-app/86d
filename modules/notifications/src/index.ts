import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { createAdminEndpointsWithSettings } from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { buildAffiliateStatusEmail } from "./emails/affiliate-status";
import { buildAppointmentStatusEmail } from "./emails/appointment-status";
import { buildAuctionWonEmail } from "./emails/auction-won";
import { buildBackInStockEmail } from "./emails/back-in-stock";
import { buildCartRecoveryEmail } from "./emails/cart-recovery";
import { buildOrderCancelledEmail } from "./emails/order-cancelled";
import { buildOrderConfirmationEmail } from "./emails/order-confirmation";
import { buildOrderFulfilledEmail } from "./emails/order-fulfilled";
import { buildOrderShippedEmail } from "./emails/order-shipped";
import { buildQuoteStatusEmail } from "./emails/quote-status";
import { buildReturnStatusEmail } from "./emails/return-status";
import { buildReviewApprovedEmail } from "./emails/review-approved";
import { buildSubscriptionStatusEmail } from "./emails/subscription-status";
import { buildWarrantyRegisteredEmail } from "./emails/warranty-registered";
import { ResendProvider, TwilioProvider } from "./provider";
import { notificationsSchema } from "./schema";
import { createNotificationsController } from "./service-impl";
import { createStoreEndpoints } from "./store/endpoints";

export type {
	BatchSendResult,
	DeliveryStatus,
	Notification,
	NotificationChannel,
	NotificationPreference,
	NotificationPriority,
	NotificationStats,
	NotificationsController,
	NotificationTemplate,
	NotificationType,
} from "./service";

function formatCurrency(amount: number, currency: string): string {
	const code = currency.toUpperCase();
	return `${(amount / 100).toFixed(2)} ${code}`;
}

export interface NotificationsOptions extends ModuleConfig {
	/** Max notifications per customer before auto-cleanup (default: "500") */
	maxPerCustomer?: string;
	/** Resend API key for email delivery */
	resendApiKey?: string | undefined;
	/** Sender email address for Resend (e.g. "Store Name <noreply@store.com>") */
	resendFromAddress?: string | undefined;
	/** Resend webhook signing secret — enables delivery status tracking via inbound webhooks */
	resendWebhookSecret?: string | undefined;
	/** Twilio Account SID */
	twilioAccountSid?: string | undefined;
	/** Twilio Auth Token */
	twilioAuthToken?: string | undefined;
	/** Twilio phone number in E.164 format (e.g. "+15551234567") */
	twilioFromNumber?: string | undefined;
	/** Full public URL of the Twilio StatusCallback endpoint (e.g. "https://store.com/notifications/webhook/twilio") */
	twilioStatusCallbackUrl?: string | undefined;
}

export default function notifications(options?: NotificationsOptions): Module {
	const emailProvider =
		options?.resendApiKey && options?.resendFromAddress
			? new ResendProvider(options.resendApiKey, options.resendFromAddress)
			: undefined;

	const smsProvider =
		options?.twilioAccountSid &&
		options?.twilioAuthToken &&
		options?.twilioFromNumber
			? new TwilioProvider(
					options.twilioAccountSid,
					options.twilioAuthToken,
					options.twilioFromNumber,
				)
			: undefined;

	const settingsEndpoint = createGetSettingsEndpoint({
		resendApiKey: options?.resendApiKey,
		resendFromAddress: options?.resendFromAddress,
		resendWebhookSecret: options?.resendWebhookSecret,
		twilioAccountSid: options?.twilioAccountSid,
		twilioAuthToken: options?.twilioAuthToken,
		twilioFromNumber: options?.twilioFromNumber,
		twilioStatusCallbackUrl: options?.twilioStatusCallbackUrl,
	});

	return {
		id: "notifications",
		version: "0.1.0",
		schema: notificationsSchema,
		exports: {
			read: ["unreadCount", "notificationType"],
		},
		events: {
			emits: [
				"notifications.created",
				"notifications.read",
				"notifications.all_read",
			],
		},
		init: async (ctx: ModuleContext) => {
			const maxStr = options?.maxPerCustomer;
			const maxPerCustomer = maxStr ? Number.parseInt(maxStr, 10) : undefined;

			// Wire customerResolver from the customers module so email/SMS
			// delivery can look up contact info for in-app notifications,
			// template-based batch sends, and SMS delivery.
			const customersCtrl = ctx.controllers.customer as
				| {
						getById(id: string): Promise<{
							email?: string;
							phone?: string;
						} | null>;
				  }
				| undefined;

			const customerResolver = customersCtrl
				? async (customerId: string) => {
						const c = await customersCtrl.getById(customerId).catch(() => null);
						return { email: c?.email, phone: c?.phone };
					}
				: undefined;

			const controller = createNotificationsController(ctx.data, ctx.events, {
				...(maxPerCustomer && !Number.isNaN(maxPerCustomer)
					? { maxPerCustomer }
					: {}),
				emailProvider,
				smsProvider,
				customerResolver,
				twilioStatusCallbackUrl: options?.twilioStatusCallbackUrl,
			});

			interface CheckoutCompletedPayload {
				sessionId: string;
				orderId: string;
				orderNumber: string;
				customerId?: string | undefined;
				email: string;
				customerName: string;
				items: Array<{
					name: string;
					quantity: number;
					price: number;
				}>;
				subtotal: number;
				taxAmount: number;
				shippingAmount: number;
				discountAmount: number;
				giftCardAmount: number;
				total: number;
				currency: string;
				shippingAddress?: {
					firstName?: string;
					lastName?: string;
					line1?: string;
					line2?: string;
					city?: string;
					state?: string;
					postalCode?: string;
					country?: string;
				};
			}

			ctx.events?.on<CheckoutCompletedPayload>(
				"checkout.completed",
				async (event) => {
					const p = event.payload;
					if (!p) return;

					// Create in-app notification for logged-in customers
					if (p.customerId) {
						await controller.create({
							customerId: p.customerId,
							type: "order",
							channel: emailProvider ? "both" : "in_app",
							priority: "normal",
							title: `Order ${p.orderNumber} confirmed`,
							body: `Thank you for your order! Your order total is ${formatCurrency(p.total, p.currency)}.`,
							actionUrl: `/orders/${p.orderId}`,
							metadata: {
								orderId: p.orderId,
								orderNumber: p.orderNumber,
								total: p.total,
								currency: p.currency,
							},
						});
					}

					// Send order confirmation email directly (works for both guests and customers)
					if (emailProvider && p.email) {
						const { subject, html, text } = buildOrderConfirmationEmail(p);
						await emailProvider
							.sendEmail({
								to: p.email,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: "order_confirmation" },
									{ name: "order_id", value: p.orderId },
								],
							})
							.catch(() => {
								// Email delivery failure is non-fatal — the in-app
								// notification still exists for logged-in customers
							});
					}
				},
			);

			interface OrderLifecyclePayload {
				orderId: string;
				orderNumber: string;
				customerId?: string | undefined;
				email: string;
				customerName: string;
				reason?: string | undefined;
			}

			ctx.events?.on<OrderLifecyclePayload>(
				"order.fulfilled",
				async (event) => {
					const p = event.payload;
					if (!p) return;

					if (p.customerId) {
						await controller.create({
							customerId: p.customerId,
							type: "order",
							channel: emailProvider ? "both" : "in_app",
							priority: "normal",
							title: `Order ${p.orderNumber} fulfilled`,
							body: "Your order has been fulfilled and is on its way!",
							actionUrl: `/orders/${p.orderId}`,
							metadata: {
								orderId: p.orderId,
								orderNumber: p.orderNumber,
							},
						});
					}

					if (emailProvider && p.email) {
						const { subject, html, text } = buildOrderFulfilledEmail(p);
						await emailProvider
							.sendEmail({
								to: p.email,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: "order_fulfilled" },
									{ name: "order_id", value: p.orderId },
								],
							})
							.catch(() => {});
					}
				},
			);

			interface OrderShippedPayload {
				orderId: string;
				orderNumber: string;
				email: string;
				customerName: string;
				carrier?: string | undefined;
				trackingNumber?: string | undefined;
				trackingUrl?: string | undefined;
			}

			ctx.events?.on<OrderShippedPayload>("order.shipped", async (event) => {
				const p = event.payload;
				if (!p) return;

				if (emailProvider && p.email) {
					const { subject, html, text } = buildOrderShippedEmail(p);
					await emailProvider
						.sendEmail({
							to: p.email,
							subject,
							html,
							text,
							tags: [
								{ name: "type", value: "order_shipped" },
								{ name: "order_id", value: p.orderId },
							],
						})
						.catch(() => {});
				}
			});

			ctx.events?.on<OrderLifecyclePayload>(
				"order.cancelled",
				async (event) => {
					const p = event.payload;
					if (!p) return;

					if (p.customerId) {
						await controller.create({
							customerId: p.customerId,
							type: "order",
							channel: emailProvider ? "both" : "in_app",
							priority: "high",
							title: `Order ${p.orderNumber} cancelled`,
							body: p.reason
								? `Your order has been cancelled. Reason: ${p.reason}`
								: "Your order has been cancelled. If a payment was collected, a refund will be processed.",
							actionUrl: `/orders/${p.orderId}`,
							metadata: {
								orderId: p.orderId,
								orderNumber: p.orderNumber,
								reason: p.reason,
							},
						});
					}

					if (emailProvider && p.email) {
						const { subject, html, text } = buildOrderCancelledEmail(p);
						await emailProvider
							.sendEmail({
								to: p.email,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: "order_cancelled" },
									{ name: "order_id", value: p.orderId },
								],
							})
							.catch(() => {});
					}
				},
			);

			interface ReturnEventPayload {
				returnId: string;
				orderId: string;
				orderNumber?: string | undefined;
				email?: string | undefined;
				customerName?: string | undefined;
				reason?: string | undefined;
				adminNotes?: string | undefined;
			}

			const returnStatuses = [
				"requested",
				"approved",
				"rejected",
				"completed",
			] as const;

			for (const status of returnStatuses) {
				ctx.events?.on<ReturnEventPayload>(
					`return.${status}`,
					async (event) => {
						const p = event.payload;
						if (!p) return;

						if (emailProvider && p.email) {
							const { subject, html, text } = buildReturnStatusEmail({
								status,
								orderNumber: p.orderNumber ?? p.orderId,
								customerName: p.customerName ?? "",
								reason: p.reason,
								adminNotes: p.adminNotes,
							});
							await emailProvider
								.sendEmail({
									to: p.email,
									subject,
									html,
									text,
									tags: [
										{ name: "type", value: `return_${status}` },
										{ name: "return_id", value: p.returnId },
										{ name: "order_id", value: p.orderId },
									],
								})
								.catch(() => {});
						}
					},
				);
			}

			interface CartRecoveryPayload {
				cartId: string;
				channel: string;
				recipient: string;
				attemptId: string;
			}

			ctx.events?.on<CartRecoveryPayload>(
				"cart.recoveryAttempted",
				async (event) => {
					const p = event.payload;
					if (!p || p.channel !== "email" || !emailProvider) return;

					const abandonedCartsCtrl = ctx.controllers.abandonedCarts as
						| {
								get(id: string): Promise<{
									id: string;
									items: Array<{
										name: string;
										quantity: number;
										price: number;
										imageUrl?: string | undefined;
									}>;
									cartTotal: number;
									currency: string;
									recoveryToken: string;
								} | null>;
						  }
						| undefined;

					if (!abandonedCartsCtrl) return;

					const cart = await abandonedCartsCtrl.get(p.cartId).catch(() => null);
					if (!cart) return;

					const recoveryUrl = `/abandoned-carts/recover/${cart.recoveryToken}`;
					const { subject, html, text } = buildCartRecoveryEmail({
						items: cart.items,
						cartTotal: cart.cartTotal,
						currency: cart.currency,
						recoveryUrl,
					});

					await emailProvider
						.sendEmail({
							to: p.recipient,
							subject,
							html,
							text,
							tags: [
								{ name: "type", value: "cart_recovery" },
								{ name: "cart_id", value: p.cartId },
								{ name: "attempt_id", value: p.attemptId },
							],
						})
						.catch(() => {});
				},
			);

			// ── Warranty registration notifications ──────────────────────────
			interface WarrantyRegisteredPayload {
				registrationId: string;
				customerId: string;
				productId: string;
				warrantyPlanId: string;
				productName?: string | undefined;
				serialNumber?: string | undefined;
				expiresAt?: Date | undefined;
			}

			ctx.events?.on<WarrantyRegisteredPayload>(
				"warranty.registered",
				async (event) => {
					const p = event.payload;
					if (!p || !emailProvider || !customerResolver) return;

					const contact = await customerResolver(p.customerId).catch(
						() => null,
					);
					if (!contact?.email) return;

					const { subject, html, text } = buildWarrantyRegisteredEmail({
						productName: p.productName ?? p.productId,
						serialNumber: p.serialNumber,
						expiresAt: p.expiresAt,
					});
					await emailProvider
						.sendEmail({
							to: contact.email,
							subject,
							html,
							text,
							tags: [
								{ name: "type", value: "warranty_registered" },
								{ name: "registration_id", value: p.registrationId },
							],
						})
						.catch(() => {});
				},
			);

			// ── Review approved notifications ───────────────────────────────
			interface ReviewApprovedPayload {
				reviewId: string;
				productId: string;
				customerId?: string | undefined;
				authorEmail?: string | undefined;
				rating: number;
			}

			ctx.events?.on<ReviewApprovedPayload>(
				"review.approved",
				async (event) => {
					const p = event.payload;
					if (!p || !emailProvider) return;

					// Try to get email from the event payload first, then from customerResolver
					let email = p.authorEmail;
					if (!email && p.customerId && customerResolver) {
						const contact = await customerResolver(p.customerId).catch(
							() => null,
						);
						email = contact?.email;
					}
					if (!email) return;

					const { subject, html, text } = buildReviewApprovedEmail({
						rating: p.rating,
					});
					await emailProvider
						.sendEmail({
							to: email,
							subject,
							html,
							text,
							tags: [
								{ name: "type", value: "review_approved" },
								{ name: "review_id", value: p.reviewId },
							],
						})
						.catch(() => {});
				},
			);

			// ── Auction won notifications ────────────────────────────────────
			interface AuctionSoldPayload {
				auctionId: string;
				title: string;
				winnerId?: string | undefined;
				salePrice: number;
			}

			ctx.events?.on<AuctionSoldPayload>("auction.sold", async (event) => {
				const p = event.payload;
				if (!p || !emailProvider || !p.winnerId || !customerResolver) return;

				const winnerContact = await customerResolver(p.winnerId).catch(
					() => null,
				);
				if (!winnerContact?.email) return;

				const { subject, html, text } = buildAuctionWonEmail({
					auctionTitle: p.title,
					winningBid: p.salePrice,
				});
				await emailProvider
					.sendEmail({
						to: winnerContact.email,
						subject,
						html,
						text,
						tags: [
							{ name: "type", value: "auction_won" },
							{ name: "auction_id", value: p.auctionId },
						],
					})
					.catch(() => {});
			});

			// ── Back-in-stock notifications ─────────────────────────────────
			interface BackInStockPayload {
				productId: string;
				variantId?: string | undefined;
				available: number;
				subscribers: Array<{
					email: string;
					productName: string;
				}>;
			}

			ctx.events?.on<BackInStockPayload>(
				"inventory.back-in-stock",
				async (event) => {
					const p = event.payload;
					if (!p || !emailProvider || !p.subscribers.length) return;

					for (const sub of p.subscribers) {
						const { subject, html, text } = buildBackInStockEmail({
							productName: sub.productName,
						});
						await emailProvider
							.sendEmail({
								to: sub.email,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: "back_in_stock" },
									{ name: "product_id", value: p.productId },
								],
							})
							.catch(() => {});
					}
				},
			);

			// ── Subscription notifications ───────────────────────────────────
			interface SubscriptionEventPayload {
				subscriptionId: string;
				planId: string;
				customerId: string;
				email?: string | undefined;
				planName?: string | undefined;
				price?: number | undefined;
				currency?: string | undefined;
			}

			const subscriptionStatuses = ["created", "cancelled", "renewed"] as const;

			for (const status of subscriptionStatuses) {
				ctx.events?.on<SubscriptionEventPayload>(
					`subscription.${status}`,
					async (event) => {
						const p = event.payload;
						if (!p || !emailProvider || !p.email) return;

						const { subject, html, text } = buildSubscriptionStatusEmail({
							status,
							customerEmail: p.email,
							planName: p.planName ?? p.planId,
							price: p.price,
							currency: p.currency,
						});
						await emailProvider
							.sendEmail({
								to: p.email,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: `subscription_${status}` },
									{ name: "subscription_id", value: p.subscriptionId },
								],
							})
							.catch(() => {});
					},
				);
			}

			// ── Appointment notifications ────────────────────────────────────
			interface AppointmentEventPayload {
				appointmentId: string;
				serviceId: string;
				customerId?: string | undefined;
				customerEmail?: string | undefined;
				customerName?: string | undefined;
				startsAt?: Date | undefined;
			}

			const appointmentStatuses = [
				"created",
				"confirmed",
				"cancelled",
			] as const;

			for (const status of appointmentStatuses) {
				ctx.events?.on<AppointmentEventPayload>(
					`appointment.${status}`,
					async (event) => {
						const p = event.payload;
						if (!p || !emailProvider || !p.customerEmail) return;

						const { subject, html, text } = buildAppointmentStatusEmail({
							status,
							customerName: p.customerName ?? "",
							serviceName: p.serviceId,
							startsAt: p.startsAt ?? new Date(),
						});
						await emailProvider
							.sendEmail({
								to: p.customerEmail,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: `appointment_${status}` },
									{ name: "appointment_id", value: p.appointmentId },
								],
							})
							.catch(() => {});
					},
				);
			}

			// ── Affiliate notifications ──────────────────────────────────────
			interface AffiliateEventPayload {
				affiliateId: string;
				email?: string | undefined;
				name?: string | undefined;
				customerId?: string | undefined;
			}

			const affiliateStatuses = [
				"application_submitted",
				"approved",
				"rejected",
			] as const;

			for (const status of affiliateStatuses) {
				ctx.events?.on<AffiliateEventPayload>(
					`affiliates.${status}`,
					async (event) => {
						const p = event.payload;
						if (!p || !emailProvider || !p.email) return;

						const emailStatus =
							status === "application_submitted" ? "submitted" : status;
						const { subject, html, text } = buildAffiliateStatusEmail({
							status: emailStatus,
							name: p.name ?? "there",
						});
						await emailProvider
							.sendEmail({
								to: p.email,
								subject,
								html,
								text,
								tags: [
									{ name: "type", value: `affiliate_${status}` },
									{ name: "affiliate_id", value: p.affiliateId },
								],
							})
							.catch(() => {});
					},
				);
			}

			// ── Quote notifications ──────────────────────────────────────────
			interface QuoteEventPayload {
				quoteId: string;
				customerId?: string | undefined;
				total?: number | undefined;
				currency?: string | undefined;
				reason?: string | undefined;
				status?: string | undefined;
			}

			const quoteStatuses = [
				"submitted",
				"reviewed",
				"accepted",
				"rejected",
				"converted",
			] as const;

			for (const status of quoteStatuses) {
				ctx.events?.on<QuoteEventPayload>(`quote.${status}`, async (event) => {
					const p = event.payload;
					if (!p || !emailProvider || !p.customerId || !customerResolver)
						return;

					const contact = await customerResolver(p.customerId).catch(
						() => null,
					);
					if (!contact?.email) return;

					const { subject, html, text } = buildQuoteStatusEmail({
						status,
						quoteId: p.quoteId,
						total: p.total,
						currency: p.currency,
						reason: p.reason,
					});
					await emailProvider
						.sendEmail({
							to: contact.email,
							subject,
							html,
							text,
							tags: [
								{ name: "type", value: `quote_${status}` },
								{ name: "quote_id", value: p.quoteId },
							],
						})
						.catch(() => {});
				});
			}

			return { controllers: { notifications: controller } };
		},
		endpoints: {
			store: createStoreEndpoints({
				resendWebhookSecret: options?.resendWebhookSecret,
				twilioAuthToken: options?.twilioAuthToken,
				twilioWebhookUrl: options?.twilioStatusCallbackUrl,
			}),
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
		},
		admin: {
			pages: [
				{
					path: "/admin/notifications",
					component: "NotificationList",
					label: "Notifications",
					icon: "Bell",
					group: "Support",
				},
				{
					path: "/admin/notifications/compose",
					component: "NotificationComposer",
					label: "Compose",
					icon: "PaperPlaneTilt",
					group: "Support",
				},
				{
					path: "/admin/notifications/templates",
					component: "NotificationTemplateList",
					label: "Templates",
					icon: "FileText",
					group: "Support",
				},
				{
					path: "/admin/notifications/settings",
					component: "NotificationSettings",
					label: "Settings",
					icon: "Gear",
					group: "Support",
				},
			],
		},
		store: {
			pages: [
				{
					path: "/notifications",
					component: "NotificationInbox",
				},
				{
					path: "/notifications/preferences",
					component: "NotificationPreferences",
				},
			],
		},
		options,
	};
}
