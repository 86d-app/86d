import { createStoreEndpoint } from "@86d-app/core";

interface BraintreeWebhookOptions {
	/** Braintree public key — used to match the prefix in bt_signature. */
	publicKey: string;
	/** Braintree private key — used as the HMAC-SHA1 secret over bt_payload. */
	privateKey: string;
}

// ── Braintree signature verification ──────────────────────────────────────────
// Braintree sends webhooks as application/x-www-form-urlencoded with two fields:
//   bt_signature: "<publicKey>|<hex(HMAC-SHA1(privateKey, bt_payload))>"
//   bt_payload:   base64-encoded XML notification
// https://developer.paypal.com/braintree/docs/guides/webhooks/parse

const enc = new TextEncoder();

async function hmacSha1Hex(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-1" },
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

async function verifyBraintreeSignature(
	btSignature: string,
	btPayload: string,
	publicKey: string,
	privateKey: string,
): Promise<boolean> {
	// bt_signature format: "PUBLIC_KEY|HEX_HMAC_SHA1(PRIVATE_KEY, bt_payload)"
	const pipeIndex = btSignature.indexOf("|");
	if (pipeIndex === -1) return false;
	const sigPublicKey = btSignature.slice(0, pipeIndex);
	const signature = btSignature.slice(pipeIndex + 1);
	if (!sigPublicKey || !signature) return false;

	if (!timingSafeEqual(sigPublicKey, publicKey)) return false;

	const expected = await hmacSha1Hex(privateKey, btPayload);
	return timingSafeEqual(signature, expected);
}

/** Extract the `kind` field from the base64-encoded XML payload. */
function extractKind(btPayload: string): string | undefined {
	try {
		const xml = atob(btPayload);
		const match = xml.match(/<kind>([^<]+)<\/kind>/);
		return match?.[1];
	} catch {
		return undefined;
	}
}

/** Extract a transaction ID from the base64-encoded XML payload. */
function extractTransactionId(btPayload: string): string | undefined {
	try {
		const xml = atob(btPayload);
		const match = xml.match(/<id>([^<]+)<\/id>/);
		return match?.[1];
	} catch {
		return undefined;
	}
}

/** Extract the amount from the base64-encoded XML payload. */
function extractAmount(btPayload: string): number | undefined {
	try {
		const xml = atob(btPayload);
		const match = xml.match(/<amount>([^<]+)<\/amount>/);
		if (!match?.[1]) return undefined;
		return Math.round(Number.parseFloat(match[1]) * 100);
	} catch {
		return undefined;
	}
}

// ── Braintree event kind → payment status mapping ────────────────────────────

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

const BRAINTREE_EVENT_MAP: Record<string, EventMapping> = {
	transaction_settled: {
		status: "succeeded",
		domainEvent: "payment.completed",
	},
	transaction_disbursed: {
		status: "succeeded",
		domainEvent: "payment.completed",
	},
	transaction_settlement_declined: {
		status: "failed",
		domainEvent: "payment.failed",
	},
};

/** Check if the kind represents a refund by inspecting XML for refund markers. */
function isRefundNotification(kind: string, btPayload: string): boolean {
	if (kind !== "transaction_settled") return false;
	try {
		const xml = atob(btPayload);
		return (
			xml.includes("<type>credit</type>") ||
			xml.includes("<refunded-transaction-id>")
		);
	} catch {
		return false;
	}
}

// ── Endpoint factory ──────────────────────────────────────────────────────────

/**
 * Create the Braintree webhook endpoint with HMAC-SHA1 signature verification.
 * Braintree always sends `bt_signature` and `bt_payload` — verification is
 * always enforced (no dev-mode passthrough since credentials are required).
 */
export function createBraintreeWebhook(opts: BraintreeWebhookOptions) {
	return createStoreEndpoint(
		"/braintree/webhook",
		{
			method: "POST",
			requireRequest: true,
		},
		// biome-ignore lint/suspicious/noExplicitAny: endpoint handler
		async (ctx: any): Promise<Response> => {
			const request = ctx.request as Request;
			const rawBody = await request.text();

			// Braintree sends application/x-www-form-urlencoded
			const params = new URLSearchParams(rawBody);
			const btSignature = params.get("bt_signature");
			const btPayload = params.get("bt_payload");

			if (!btSignature || !btPayload) {
				return Response.json(
					{ error: "Missing bt_signature or bt_payload." },
					{ status: 400 },
				);
			}

			const valid = await verifyBraintreeSignature(
				btSignature,
				btPayload,
				opts.publicKey,
				opts.privateKey,
			);
			if (!valid) {
				return Response.json(
					{ error: "Invalid webhook signature." },
					{ status: 401 },
				);
			}

			const kind = extractKind(btPayload);
			if (!kind) {
				return Response.json(
					{ error: "Missing or unparseable event kind." },
					{ status: 400 },
				);
			}

			// ── Process payment events ──────────────────────────────────────
			const transactionId = extractTransactionId(btPayload);
			// biome-ignore lint/suspicious/noExplicitAny: cross-module controller access
			const paymentsCtrl = ctx.context?.controllers?.payments as any;
			// biome-ignore lint/suspicious/noExplicitAny: scoped event emitter
			const events = ctx.context?.events as any;

			if (transactionId && paymentsCtrl) {
				// Check if this is a refund notification
				if (isRefundNotification(kind, btPayload)) {
					const amount = extractAmount(btPayload);
					const result = await paymentsCtrl.handleWebhookRefund({
						providerIntentId: transactionId,
						providerRefundId: `bt_re_${transactionId}`,
						amount,
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
						kind,
						handled: true,
					});
				}

				const mapping = BRAINTREE_EVENT_MAP[kind];
				if (mapping) {
					const updated = await paymentsCtrl.handleWebhookEvent({
						providerIntentId: transactionId,
						status: mapping.status,
						providerMetadata: {
							braintreeKind: kind,
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
						kind,
						handled: true,
					});
				}
			}

			return Response.json({ received: true, kind });
		},
	);
}
