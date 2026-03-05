import { createStoreEndpoint } from "@86d-app/core";

interface StripeWebhookOptions {
	/** Stripe webhook signing secret (whsec_...). When provided, incoming requests
	 *  are rejected if the `Stripe-Signature` header is absent or invalid. */
	webhookSecret?: string | undefined;
}

// ── Stripe signature verification ─────────────────────────────────────────────
// Inline implementation using Web Crypto API (no external dependencies).
// The same algorithm is available in packages/utils/src/crypto.ts for non-module use.

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/** Default tolerance: 5 minutes */
const TOLERANCE_MS = 300_000;

async function verifyStripeSignature(
	rawBody: string,
	signatureHeader: string,
	secret: string,
): Promise<boolean> {
	const parts = Object.fromEntries(
		signatureHeader.split(",").map((s) => s.split("=", 2) as [string, string]),
	);
	const timestamp = parts.t;
	const v1 = parts.v1;
	if (!timestamp || !v1) return false;

	if (Date.now() - Number(timestamp) * 1000 > TOLERANCE_MS) return false;

	const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
	return timingSafeEqual(v1, expected);
}

// ── Stripe event → payment status mapping ────────────────────────────────────

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

const STRIPE_EVENT_MAP: Record<string, EventMapping> = {
	"payment_intent.succeeded": {
		status: "succeeded",
		domainEvent: "payment.completed",
	},
	"payment_intent.payment_failed": {
		status: "failed",
		domainEvent: "payment.failed",
	},
	"payment_intent.canceled": {
		status: "cancelled",
		domainEvent: "",
	},
	"charge.succeeded": {
		status: "succeeded",
		domainEvent: "payment.completed",
	},
	"charge.failed": {
		status: "failed",
		domainEvent: "payment.failed",
	},
};

const STRIPE_REFUND_EVENTS = new Set([
	"charge.refunded",
	"charge.dispute.funds_withdrawn",
]);

/** Extract the Stripe payment intent ID from the event data object. */
function extractProviderIntentId(
	event: Record<string, unknown>,
): string | undefined {
	// biome-ignore lint/suspicious/noExplicitAny: Stripe event structure is deeply nested
	const data = event.data as any;
	const obj = data?.object;
	if (!obj) return undefined;

	// For payment_intent events, the object IS the payment intent
	if (typeof obj.id === "string" && obj.id.startsWith("pi_")) return obj.id;

	// For charge events, the payment_intent field references the PI
	if (typeof obj.payment_intent === "string") return obj.payment_intent;

	return undefined;
}

/** Extract refund details from a charge.refunded event. */
function extractRefundDetails(event: Record<string, unknown>):
	| {
			providerRefundId: string;
			amount: number;
	  }
	| undefined {
	// biome-ignore lint/suspicious/noExplicitAny: Stripe event structure is deeply nested
	const data = event.data as any;
	const obj = data?.object;
	if (!obj?.refunds?.data) return undefined;

	const latestRefund = obj.refunds.data[0];
	if (!latestRefund) return undefined;

	return {
		providerRefundId: latestRefund.id ?? `re_unknown_${crypto.randomUUID()}`,
		amount:
			typeof latestRefund.amount === "number"
				? latestRefund.amount
				: (obj.amount_refunded ?? 0),
	};
}

// ── Endpoint factory ──────────────────────────────────────────────────────────

/**
 * Create the Stripe webhook endpoint.
 * Pass `{ webhookSecret }` from module options to enable signature verification.
 *
 * Without a secret the endpoint still works (useful for local development),
 * but all incoming requests are accepted without verification.
 */
export function createStripeWebhook(opts: StripeWebhookOptions) {
	return createStoreEndpoint(
		"/stripe/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		// biome-ignore lint/suspicious/noExplicitAny: endpoint handler
		async (ctx: any): Promise<Response> => {
			const request = ctx.request as Request;

			// Read raw body before any JSON.parse to preserve bytes for HMAC
			const rawBody = await request.text();

			// Signature verification (skipped if no secret configured)
			if (opts.webhookSecret) {
				const sigHeader = request.headers.get("stripe-signature") ?? "";
				const valid = await verifyStripeSignature(
					rawBody,
					sigHeader,
					opts.webhookSecret,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid or expired webhook signature." },
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
				if (STRIPE_REFUND_EVENTS.has(eventType)) {
					const refundDetails = extractRefundDetails(event);
					const result = await payments.handleWebhookRefund({
						providerIntentId,
						providerRefundId:
							refundDetails?.providerRefundId ?? `re_${crypto.randomUUID()}`,
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

				const mapping = STRIPE_EVENT_MAP[eventType];
				if (mapping) {
					const updated = await payments.handleWebhookEvent({
						providerIntentId,
						status: mapping.status,
						providerMetadata: {
							stripeEventId: event.id,
							stripeEventType: eventType,
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
