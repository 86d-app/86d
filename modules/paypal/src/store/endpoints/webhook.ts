import { createStoreEndpoint } from "@86d-app/core";

interface PayPalWebhookOptions {
	clientId: string;
	clientSecret: string;
	/** PayPal webhook ID (from dashboard). When provided, signature verification is enabled. */
	webhookId?: string | undefined;
	/** Use sandbox environment. Pass "true" to enable. */
	sandbox?: string | undefined;
}

// ── PayPal signature verification ─────────────────────────────────────────────
// PayPal uses asymmetric RSA signatures that require calling their verification
// API. We POST the event headers + body to PayPal, and they confirm authenticity.
// https://developer.paypal.com/api/rest/webhooks/rest/

async function getAccessToken(
	clientId: string,
	clientSecret: string,
	baseUrl: string,
): Promise<string | null> {
	const credentials = btoa(`${clientId}:${clientSecret}`);
	const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${credentials}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: "grant_type=client_credentials",
	});
	if (!res.ok) return null;
	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

async function verifyPayPalSignature(
	rawBody: string,
	requestHeaders: { get(name: string): string | null },
	webhookId: string,
	clientId: string,
	clientSecret: string,
	baseUrl: string,
): Promise<boolean> {
	const authAlgo = requestHeaders.get("paypal-auth-algo");
	const certUrl = requestHeaders.get("paypal-cert-url");
	const transmissionId = requestHeaders.get("paypal-transmission-id");
	const transmissionSig = requestHeaders.get("paypal-transmission-sig");
	const transmissionTime = requestHeaders.get("paypal-transmission-time");

	if (
		!authAlgo ||
		!certUrl ||
		!transmissionId ||
		!transmissionSig ||
		!transmissionTime
	) {
		return false;
	}

	let webhookEvent: unknown;
	try {
		webhookEvent = JSON.parse(rawBody);
	} catch {
		return false;
	}

	try {
		const token = await getAccessToken(clientId, clientSecret, baseUrl);
		if (!token) return false;
		const res = await fetch(
			`${baseUrl}/v1/notifications/verify-webhook-signature`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					auth_algo: authAlgo,
					cert_url: certUrl,
					transmission_id: transmissionId,
					transmission_sig: transmissionSig,
					transmission_time: transmissionTime,
					webhook_id: webhookId,
					webhook_event: webhookEvent,
				}),
			},
		);
		if (!res.ok) return false;
		const data = (await res.json()) as { verification_status: string };
		return data.verification_status === "SUCCESS";
	} catch {
		return false;
	}
}

// ── PayPal event → payment status mapping ────────────────────────────────────

type PaymentIntentStatus =
	| "pending"
	| "processing"
	| "succeeded"
	| "failed"
	| "cancelled"
	| "refunded";

interface EventMapping {
	status: PaymentIntentStatus;
	domainEvent: string;
}

const PAYPAL_EVENT_MAP: Record<string, EventMapping> = {
	"PAYMENT.CAPTURE.COMPLETED": {
		status: "succeeded",
		domainEvent: "payment.completed",
	},
	"PAYMENT.CAPTURE.DENIED": {
		status: "failed",
		domainEvent: "payment.failed",
	},
	"PAYMENT.CAPTURE.PENDING": {
		status: "processing",
		domainEvent: "",
	},
	"CHECKOUT.ORDER.APPROVED": {
		status: "processing",
		domainEvent: "",
	},
};

const PAYPAL_REFUND_EVENTS = new Set([
	"PAYMENT.CAPTURE.REFUNDED",
	"PAYMENT.SALE.REFUNDED",
]);

/** Extract the provider intent ID from a PayPal webhook event. */
function extractProviderIntentId(
	event: Record<string, unknown>,
): string | undefined {
	// biome-ignore lint/suspicious/noExplicitAny: PayPal event structure varies by event type
	const resource = event.resource as any;
	if (!resource) return undefined;

	// PAYMENT.CAPTURE events: resource.id is the capture ID, supplementary_data has the order/intent
	if (typeof resource.supplementary_data?.related_ids?.order_id === "string") {
		return resource.supplementary_data.related_ids.order_id;
	}

	// Direct resource ID (order or capture)
	if (typeof resource.id === "string") return resource.id;

	return undefined;
}

/** Extract refund details from a refund event. */
function extractRefundDetails(event: Record<string, unknown>):
	| {
			providerRefundId: string;
			amount: number;
	  }
	| undefined {
	// biome-ignore lint/suspicious/noExplicitAny: PayPal event structure varies
	const resource = event.resource as any;
	if (!resource) return undefined;

	return {
		providerRefundId: resource.id ?? `pp_re_${crypto.randomUUID()}`,
		amount:
			typeof resource.amount?.value === "string"
				? Math.round(Number.parseFloat(resource.amount.value) * 100)
				: 0,
	};
}

// ── Endpoint factory ──────────────────────────────────────────────────────────

/**
 * Create the PayPal webhook endpoint.
 * Provide `{ webhookId }` (from PayPal dashboard) to enable signature
 * verification via PayPal's REST API. Without a `webhookId`, all requests
 * are accepted (useful for local development).
 */
export function createPayPalWebhook(opts: PayPalWebhookOptions) {
	const baseUrl =
		opts.sandbox === "true"
			? "https://api-m.sandbox.paypal.com"
			: "https://api-m.paypal.com";

	return createStoreEndpoint(
		"/paypal/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		// biome-ignore lint/suspicious/noExplicitAny: endpoint handler
		async (ctx: any): Promise<Response> => {
			const request = ctx.request as Request;
			const rawBody = await request.text();

			if (opts.webhookId) {
				const valid = await verifyPayPalSignature(
					rawBody,
					request.headers,
					opts.webhookId,
					opts.clientId,
					opts.clientSecret,
					baseUrl,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid or unverifiable webhook signature." },
						{ status: 401 },
					);
				}
			}

			let event: Record<string, unknown>;
			try {
				event = JSON.parse(rawBody) as Record<string, unknown>;
			} catch {
				return Response.json({ error: "Invalid JSON body." }, { status: 400 });
			}

			const eventType = event.event_type as string | undefined;
			if (!eventType) {
				return Response.json({ error: "Missing event type." }, { status: 400 });
			}

			// ── Process payment events ──────────────────────────────────────
			const providerIntentId = extractProviderIntentId(event);
			// biome-ignore lint/suspicious/noExplicitAny: cross-module controller access
			const payments = ctx.context?.controllers?.payments as any;
			// biome-ignore lint/suspicious/noExplicitAny: scoped event emitter
			const events = ctx.context?.events as any;

			if (providerIntentId && payments) {
				if (PAYPAL_REFUND_EVENTS.has(eventType)) {
					const refundDetails = extractRefundDetails(event);
					const result = await payments.handleWebhookRefund({
						providerIntentId,
						providerRefundId:
							refundDetails?.providerRefundId ?? `pp_re_${crypto.randomUUID()}`,
						amount: refundDetails?.amount,
					});
					if (result && events) {
						await events.emit("payment.refunded", {
							paymentIntentId: result.intent.id,
							refundId: result.refund.id,
							amount: result.refund.amount,
						});
					}
					return Response.json({
						received: true,
						type: eventType,
						handled: true,
					});
				}

				const mapping = PAYPAL_EVENT_MAP[eventType];
				if (mapping) {
					const updated = await payments.handleWebhookEvent({
						providerIntentId,
						status: mapping.status,
						providerMetadata: {
							paypalEventId: event.id,
							paypalEventType: eventType,
						},
					});
					if (updated && mapping.domainEvent && events) {
						await events.emit(mapping.domainEvent, {
							paymentIntentId: updated.id,
							amount: updated.amount,
							currency: updated.currency,
							orderId: updated.orderId,
						});
					}
					return Response.json({
						received: true,
						type: eventType,
						handled: true,
					});
				}
			}

			return Response.json({ received: true, type: eventType });
		},
	);
}
