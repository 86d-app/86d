import { createStoreEndpoint } from "@86d-app/core";

interface SquareWebhookOptions {
	/** Square webhook signature key. When provided, the `x-square-hmacsha256-signature`
	 *  header is verified against the raw body + notification URL. */
	webhookSignatureKey?: string | undefined;
	/** The full URL that Square sends webhooks to (e.g. https://your-store.com/api/square/webhook).
	 *  Required for signature verification. */
	notificationUrl?: string | undefined;
}

// ── Square signature verification ─────────────────────────────────────────────
// Square signs webhooks with HMAC-SHA256 over (notificationUrl + rawBody).
// The signature is Base64-encoded in the `x-square-hmacsha256-signature` header.
// https://developer.squareup.com/docs/webhooks/step3validate

const enc = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

async function verifySquareSignature(
	rawBody: string,
	signatureHeader: string,
	signatureKey: string,
	notificationUrl: string,
): Promise<boolean> {
	if (!signatureHeader) return false;
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(signatureKey),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const payload = notificationUrl + rawBody;
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
	const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
	return timingSafeEqual(signatureHeader, expected);
}

// ── Square event → payment status mapping ────────────────────────────────────

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

const SQUARE_EVENT_MAP: Record<string, EventMapping> = {
	"payment.completed": {
		status: "succeeded",
		domainEvent: "payment.completed",
	},
	"payment.failed": {
		status: "failed",
		domainEvent: "payment.failed",
	},
	"payment.canceled": {
		status: "cancelled",
		domainEvent: "",
	},
};

const SQUARE_REFUND_EVENTS = new Set(["refund.completed", "refund.updated"]);

/** Extract the provider intent ID from a Square webhook event. */
function extractProviderIntentId(
	event: Record<string, unknown>,
): string | undefined {
	// biome-ignore lint/suspicious/noExplicitAny: Square event structure is nested
	const data = event.data as any;
	const obj = data?.object;
	if (!obj) return undefined;

	// Payment events: data.object.payment.id
	if (typeof obj.payment?.id === "string") return obj.payment.id;

	// Refund events: data.object.refund.payment_id
	if (typeof obj.refund?.payment_id === "string") return obj.refund.payment_id;

	return undefined;
}

/** Extract refund details from a Square refund event. */
function extractRefundDetails(event: Record<string, unknown>):
	| {
			providerRefundId: string;
			amount: number;
	  }
	| undefined {
	// biome-ignore lint/suspicious/noExplicitAny: Square event structure is nested
	const data = event.data as any;
	const refund = data?.object?.refund;
	if (!refund) return undefined;

	return {
		providerRefundId: refund.id ?? `sq_re_${crypto.randomUUID()}`,
		amount:
			typeof refund.amount_money?.amount === "number"
				? refund.amount_money.amount
				: 0,
	};
}

// ── Endpoint factory ──────────────────────────────────────────────────────────

/**
 * Create the Square webhook endpoint.
 * Provide `{ webhookSignatureKey, notificationUrl }` from module options to
 * enable signature verification. Without a key, all requests are accepted.
 */
export function createSquareWebhook(opts: SquareWebhookOptions) {
	return createStoreEndpoint(
		"/square/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		// biome-ignore lint/suspicious/noExplicitAny: endpoint handler
		async (ctx: any): Promise<Response> => {
			const request = ctx.request as Request;
			const rawBody = await request.text();

			if (opts.webhookSignatureKey && opts.notificationUrl) {
				const sigHeader =
					request.headers.get("x-square-hmacsha256-signature") ?? "";
				const valid = await verifySquareSignature(
					rawBody,
					sigHeader,
					opts.webhookSignatureKey,
					opts.notificationUrl,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid webhook signature." },
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

			const eventType = event.type as string | undefined;
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
				if (SQUARE_REFUND_EVENTS.has(eventType)) {
					const refundDetails = extractRefundDetails(event);
					const result = await payments.handleWebhookRefund({
						providerIntentId,
						providerRefundId:
							refundDetails?.providerRefundId ?? `sq_re_${crypto.randomUUID()}`,
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

				const mapping = SQUARE_EVENT_MAP[eventType];
				if (mapping) {
					const updated = await payments.handleWebhookEvent({
						providerIntentId,
						status: mapping.status,
						providerMetadata: {
							squareEventId: event.event_id,
							squareEventType: eventType,
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
