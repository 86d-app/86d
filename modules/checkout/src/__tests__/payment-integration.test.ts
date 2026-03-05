import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import type { CheckoutLineItem, PaymentProcessController } from "../service";
import { createCheckoutController } from "../service-impl";

// ---------------------------------------------------------------------------
// Mock payment controller
// ---------------------------------------------------------------------------

interface MockIntent {
	id: string;
	status: string;
	amount: number;
	currency: string;
	providerMetadata?: Record<string, unknown> | undefined;
}

function createMockPaymentController(): PaymentProcessController & {
	_intents: Map<string, MockIntent>;
	_calls: Array<{ method: string; id?: string; amount?: number }>;
} {
	const intents = new Map<string, MockIntent>();
	// biome-ignore lint/suspicious/noExplicitAny: test spy accumulates heterogeneous call records
	const calls: any[] = [];

	return {
		_intents: intents,
		_calls: calls,

		async createIntent(params) {
			const id = `pi_${crypto.randomUUID().slice(0, 8)}`;
			const intent: MockIntent = {
				id,
				status: "pending",
				amount: params.amount,
				currency: params.currency ?? "USD",
			};
			intents.set(id, intent);
			calls.push({ method: "createIntent", id, amount: params.amount });
			return intent;
		},

		async confirmIntent(id) {
			const intent = intents.get(id);
			if (!intent) return null;
			intent.status = "succeeded";
			calls.push({ method: "confirmIntent", id });
			return { id: intent.id, status: intent.status };
		},

		async getIntent(id) {
			calls.push({ method: "getIntent", id });
			return intents.get(id) ?? null;
		},

		async cancelIntent(id) {
			const intent = intents.get(id);
			if (!intent) return null;
			intent.status = "cancelled";
			calls.push({ method: "cancelIntent", id });
			return { id: intent.id, status: intent.status };
		},
	};
}

/**
 * Creates a mock payment controller that simulates a Stripe-like provider
 * by returning a clientSecret in providerMetadata. Does NOT auto-confirm.
 */
function createStripePaymentController(): PaymentProcessController & {
	_intents: Map<string, MockIntent>;
	_calls: Array<{ method: string; id?: string; amount?: number }>;
} {
	const intents = new Map<string, MockIntent>();
	// biome-ignore lint/suspicious/noExplicitAny: test spy accumulates heterogeneous call records
	const calls: any[] = [];

	return {
		_intents: intents,
		_calls: calls,

		async createIntent(params) {
			const id = `pi_${crypto.randomUUID().slice(0, 8)}`;
			const secret = `${id}_secret_${crypto.randomUUID().slice(0, 8)}`;
			const intent: MockIntent = {
				id,
				status: "pending",
				amount: params.amount,
				currency: params.currency ?? "USD",
				providerMetadata: { clientSecret: secret },
			};
			intents.set(id, intent);
			calls.push({ method: "createIntent", id, amount: params.amount });
			return intent;
		},

		async confirmIntent(id) {
			const intent = intents.get(id);
			if (!intent) return null;
			intent.status = "succeeded";
			calls.push({ method: "confirmIntent", id });
			return { id: intent.id, status: intent.status };
		},

		async getIntent(id) {
			calls.push({ method: "getIntent", id });
			return intents.get(id) ?? null;
		},

		async cancelIntent(id) {
			const intent = intents.get(id);
			if (!intent) return null;
			intent.status = "cancelled";
			calls.push({ method: "cancelIntent", id });
			return { id: intent.id, status: intent.status };
		},
	};
}

/**
 * Creates a payment controller that fails to confirm (simulates declined card).
 */
function createFailingPaymentController(): PaymentProcessController & {
	_intents: Map<string, MockIntent>;
} {
	const intents = new Map<string, MockIntent>();

	return {
		_intents: intents,

		async createIntent(params) {
			const id = `pi_fail_${crypto.randomUUID().slice(0, 8)}`;
			const intent: MockIntent = {
				id,
				status: "pending",
				amount: params.amount,
				currency: params.currency ?? "USD",
			};
			intents.set(id, intent);
			return intent;
		},

		async confirmIntent(id) {
			const intent = intents.get(id);
			if (!intent) return null;
			intent.status = "failed";
			return { id: intent.id, status: intent.status };
		},

		async getIntent(id) {
			return intents.get(id) ?? null;
		},

		async cancelIntent(id) {
			const intent = intents.get(id);
			if (!intent) return null;
			intent.status = "cancelled";
			return { id: intent.id, status: intent.status };
		},
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleLineItems: CheckoutLineItem[] = [
	{ productId: "p1", name: "Widget", price: 1000, quantity: 2 },
	{ productId: "p2", name: "Gadget", price: 2000, quantity: 1 },
];

const sampleAddress = {
	firstName: "Jane",
	lastName: "Doe",
	line1: "1 Main St",
	city: "Springfield",
	state: "IL",
	postalCode: "62701",
	country: "US",
};

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		subtotal: 4000,
		taxAmount: 400,
		shippingAmount: 500,
		total: 4900,
		lineItems: sampleLineItems,
		customerId: "cust-1",
		shippingAddress: sampleAddress,
		...overrides,
	};
}

/**
 * Simulate the create-payment endpoint logic:
 * create intent → if clientSecret present, return pending (Stripe mode);
 * otherwise auto-confirm → store on session.
 */
async function simulateCreatePayment(
	checkoutCtrl: ReturnType<typeof createCheckoutController>,
	sessionId: string,
	paymentCtrl?: PaymentProcessController | undefined,
) {
	const existing = await checkoutCtrl.getById(sessionId);
	if (!existing) return { error: "Not found", status: 404 };

	if (existing.status === "completed" || existing.status === "expired") {
		return { error: "Cannot process payment", status: 422 };
	}

	// Zero total — no payment needed
	if (existing.total === 0) {
		await checkoutCtrl.setPaymentIntent(
			sessionId,
			"no_payment_required",
			"succeeded",
		);
		return {
			payment: {
				id: "no_payment_required",
				status: "succeeded",
				amount: 0,
				currency: existing.currency,
			},
		};
	}

	if (!paymentCtrl) {
		// Demo mode
		const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;
		await checkoutCtrl.setPaymentIntent(sessionId, demoId, "succeeded");
		return {
			payment: {
				id: demoId,
				status: "succeeded",
				amount: existing.total,
				currency: existing.currency,
			},
		};
	}

	// Create intent via payments module
	const intent = await paymentCtrl.createIntent({
		amount: existing.total,
		currency: existing.currency,
		customerId: existing.customerId,
		checkoutSessionId: sessionId,
	});

	// If provider returned clientSecret, do NOT auto-confirm (Stripe mode)
	const clientSecret =
		(intent.providerMetadata?.clientSecret as string) ?? undefined;
	if (clientSecret) {
		await checkoutCtrl.setPaymentIntent(sessionId, intent.id, intent.status);
		return {
			payment: {
				id: intent.id,
				status: intent.status,
				amount: intent.amount,
				currency: intent.currency,
				clientSecret,
			},
		};
	}

	// No clientSecret — auto-confirm (provider without client-side flow)
	const confirmed = await paymentCtrl.confirmIntent(intent.id);
	const finalStatus = confirmed?.status ?? intent.status;

	await checkoutCtrl.setPaymentIntent(sessionId, intent.id, finalStatus);

	return {
		payment: {
			id: intent.id,
			status: finalStatus,
			amount: intent.amount,
			currency: intent.currency,
		},
	};
}

/**
 * Simulate the get-payment-status endpoint logic:
 * fetches latest status from provider and syncs to session.
 */
async function simulateGetPaymentStatus(
	checkoutCtrl: ReturnType<typeof createCheckoutController>,
	sessionId: string,
	paymentCtrl?: PaymentProcessController | undefined,
) {
	const existing = await checkoutCtrl.getById(sessionId);
	if (!existing) return { error: "Not found", status: 404 };

	if (!existing.paymentIntentId) {
		return { payment: null, session: existing };
	}

	// Demo/no-payment intents
	if (
		existing.paymentIntentId === "no_payment_required" ||
		existing.paymentIntentId.startsWith("demo_")
	) {
		return {
			payment: {
				id: existing.paymentIntentId,
				status: existing.paymentStatus ?? "succeeded",
				amount: existing.total,
				currency: existing.currency,
			},
			session: existing,
		};
	}

	// Sync from provider
	if (paymentCtrl) {
		const intent = await paymentCtrl.getIntent(existing.paymentIntentId);
		if (intent) {
			if (intent.status !== existing.paymentStatus) {
				await checkoutCtrl.setPaymentIntent(
					sessionId,
					intent.id,
					intent.status,
				);
			}
			return { payment: intent, session: existing };
		}
	}

	return {
		payment: {
			id: existing.paymentIntentId,
			status: existing.paymentStatus ?? "pending",
			amount: existing.total,
			currency: existing.currency,
		},
		session: existing,
	};
}

/**
 * Simulate the complete-session payment verification logic.
 */
async function simulateCompleteWithPayment(
	checkoutCtrl: ReturnType<typeof createCheckoutController>,
	sessionId: string,
	orderId: string,
	paymentCtrl?: PaymentProcessController | undefined,
) {
	const existing = await checkoutCtrl.getById(sessionId);
	if (!existing) return { error: "Not found", status: 404 };

	// Verify payment
	if (existing.total > 0) {
		const paymentOk =
			existing.paymentStatus === "succeeded" ||
			existing.paymentIntentId === "no_payment_required";

		if (!paymentOk) {
			if (
				paymentCtrl &&
				existing.paymentIntentId &&
				!existing.paymentIntentId.startsWith("demo_")
			) {
				const intent = await paymentCtrl.getIntent(existing.paymentIntentId);
				if (intent?.status !== "succeeded") {
					return { error: "Payment has not been completed", status: 422 };
				}
			} else if (!existing.paymentIntentId) {
				return { error: "Payment has not been initiated", status: 422 };
			}
		}
	}

	const session = await checkoutCtrl.complete(sessionId, orderId);
	return session ? { session } : { error: "Cannot complete", status: 422 };
}

/**
 * Simulate abandon-session with payment cancellation.
 */
async function simulateAbandonWithPayment(
	checkoutCtrl: ReturnType<typeof createCheckoutController>,
	sessionId: string,
	paymentCtrl?: PaymentProcessController | undefined,
) {
	const existing = await checkoutCtrl.getById(sessionId);
	if (!existing) return null;

	const session = await checkoutCtrl.abandon(sessionId);
	if (!session) return null;

	if (
		existing.paymentIntentId &&
		existing.paymentIntentId !== "no_payment_required" &&
		!existing.paymentIntentId.startsWith("demo_") &&
		paymentCtrl
	) {
		await paymentCtrl.cancelIntent(existing.paymentIntentId);
	}

	return session;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkout → payment integration", () => {
	describe("create payment intent", () => {
		it("creates and confirms a payment intent for the session total", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createMockPaymentController();

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);

			expect(result.payment).toBeDefined();
			expect(result.payment?.status).toBe("succeeded");
			expect(result.payment?.amount).toBe(4900);
			expect(result.payment?.currency).toBe("USD");

			// Intent should be stored on the session
			const updated = await checkoutCtrl.getById(session.id);
			expect(updated?.paymentIntentId).toBe(result.payment?.id);
			expect(updated?.paymentStatus).toBe("succeeded");
		});

		it("auto-succeeds in demo mode (no payment controller)", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				undefined,
			);

			expect(result.payment?.status).toBe("succeeded");
			expect(result.payment?.id).toMatch(/^demo_/);

			const updated = await checkoutCtrl.getById(session.id);
			expect(updated?.paymentIntentId).toMatch(/^demo_/);
			expect(updated?.paymentStatus).toBe("succeeded");
		});

		it("skips payment for zero-total sessions", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createMockPaymentController();

			const session = await checkoutCtrl.create(
				makeSession({ total: 0, subtotal: 0 }),
			);
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);

			expect(result.payment?.id).toBe("no_payment_required");
			expect(result.payment?.status).toBe("succeeded");
			expect(result.payment?.amount).toBe(0);

			// No calls to payment controller
			expect(paymentCtrl._calls).toHaveLength(0);
		});

		it("rejects payment for completed sessions", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());
			await checkoutCtrl.complete(session.id, "order-1");

			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				undefined,
			);

			expect(result.error).toBeDefined();
			expect(result.status).toBe(422);
		});

		it("rejects payment for expired sessions", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession({ ttl: -1000 }));
			await checkoutCtrl.expireStale();

			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				undefined,
			);

			expect(result.error).toBeDefined();
		});
	});

	describe("complete with payment verification", () => {
		it("allows completion when payment is succeeded", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createMockPaymentController();

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(checkoutCtrl, session.id, paymentCtrl);

			const result = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-001",
				paymentCtrl,
			);

			expect("session" in result).toBe(true);
			if ("session" in result) {
				expect(result.session.status).toBe("completed");
				expect(result.session.orderId).toBe("ORD-001");
			}
		});

		it("blocks completion when payment has not been initiated", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());
			// No payment created

			const result = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-002",
				undefined,
			);

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error).toContain("Payment has not been initiated");
			}
		});

		it("blocks completion when payment failed", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createFailingPaymentController();

			const session = await checkoutCtrl.create(makeSession());

			// Create intent but confirmation fails
			const intent = await paymentCtrl.createIntent({
				amount: session.total,
				currency: "USD",
			});
			await paymentCtrl.confirmIntent(intent.id);
			await checkoutCtrl.setPaymentIntent(session.id, intent.id, "failed");

			const result = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-003",
				paymentCtrl,
			);

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error).toContain("Payment has not been completed");
			}
		});

		it("allows completion for zero-total without payment", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(
				makeSession({ total: 0, subtotal: 0 }),
			);

			const result = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-FREE",
				undefined,
			);

			expect("session" in result).toBe(true);
			if ("session" in result) {
				expect(result.session.status).toBe("completed");
			}
		});

		it("allows completion for demo payment", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				undefined, // demo mode
			);

			const result = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-DEMO",
				undefined,
			);

			expect("session" in result).toBe(true);
			if ("session" in result) {
				expect(result.session.status).toBe("completed");
			}
		});
	});

	describe("abandon with payment cancellation", () => {
		it("cancels payment intent when session is abandoned", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createMockPaymentController();

			const session = await checkoutCtrl.create(makeSession());
			const payResult = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);
			const intentId = payResult.payment?.id;

			await simulateAbandonWithPayment(checkoutCtrl, session.id, paymentCtrl);

			// Verify cancelIntent was called
			const cancelCalls = paymentCtrl._calls.filter(
				(c) => c.method === "cancelIntent",
			);
			expect(cancelCalls).toHaveLength(1);
			expect(cancelCalls[0].id).toBe(intentId);

			// Intent should be cancelled
			const intent = intentId ? paymentCtrl._intents.get(intentId) : undefined;
			expect(intent?.status).toBe("cancelled");
		});

		it("does not cancel demo payment intents", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createMockPaymentController();

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				undefined, // demo mode
			);

			await simulateAbandonWithPayment(checkoutCtrl, session.id, paymentCtrl);

			// No cancel calls (demo_ prefix is skipped)
			const cancelCalls = paymentCtrl._calls.filter(
				(c) => c.method === "cancelIntent",
			);
			expect(cancelCalls).toHaveLength(0);
		});

		it("handles abandon without payment gracefully", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());

			const abandoned = await simulateAbandonWithPayment(
				checkoutCtrl,
				session.id,
				undefined,
			);

			expect(abandoned?.status).toBe("abandoned");
		});
	});

	describe("setPaymentIntent service method", () => {
		it("stores payment intent ID and status on session", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const session = await checkoutCtrl.create(makeSession());

			const updated = await checkoutCtrl.setPaymentIntent(
				session.id,
				"pi_test_123",
				"succeeded",
			);

			expect(updated?.paymentIntentId).toBe("pi_test_123");
			expect(updated?.paymentStatus).toBe("succeeded");
		});

		it("returns null for completed sessions", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const session = await checkoutCtrl.create(makeSession());
			await checkoutCtrl.complete(session.id, "order-1");

			const result = await checkoutCtrl.setPaymentIntent(
				session.id,
				"pi_late",
				"succeeded",
			);

			expect(result).toBeNull();
		});

		it("returns null for expired sessions", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const session = await checkoutCtrl.create(makeSession({ ttl: -1000 }));
			await checkoutCtrl.expireStale();

			const result = await checkoutCtrl.setPaymentIntent(
				session.id,
				"pi_late",
				"succeeded",
			);

			expect(result).toBeNull();
		});

		it("returns null for missing sessions", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const result = await checkoutCtrl.setPaymentIntent(
				"ghost",
				"pi_ghost",
				"succeeded",
			);

			expect(result).toBeNull();
		});

		it("can update payment status multiple times", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const session = await checkoutCtrl.create(makeSession());

			await checkoutCtrl.setPaymentIntent(session.id, "pi_test", "pending");
			const updated = await checkoutCtrl.setPaymentIntent(
				session.id,
				"pi_test",
				"succeeded",
			);

			expect(updated?.paymentStatus).toBe("succeeded");
		});
	});

	describe("Stripe client-side payment flow", () => {
		it("returns clientSecret and pending status when provider has providerMetadata", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createStripePaymentController();

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);

			// Should return clientSecret and pending status (NOT auto-confirmed)
			expect(result.payment?.clientSecret).toBeDefined();
			expect(result.payment?.status).toBe("pending");
			expect(result.payment?.amount).toBe(4900);

			// Session should have the intent stored with pending status
			const updated = await checkoutCtrl.getById(session.id);
			expect(updated?.paymentIntentId).toBe(result.payment?.id);
			expect(updated?.paymentStatus).toBe("pending");
		});

		it("does NOT auto-confirm when clientSecret is present", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createStripePaymentController();

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(checkoutCtrl, session.id, paymentCtrl);

			// confirmIntent should NOT have been called
			const confirmCalls = paymentCtrl._calls.filter(
				(c) => c.method === "confirmIntent",
			);
			expect(confirmCalls).toHaveLength(0);
		});

		it("auto-confirms when provider has no clientSecret", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createMockPaymentController(); // no providerMetadata

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(checkoutCtrl, session.id, paymentCtrl);

			// confirmIntent SHOULD have been called
			const confirmCalls = paymentCtrl._calls.filter(
				(c) => c.method === "confirmIntent",
			);
			expect(confirmCalls).toHaveLength(1);
		});

		it("syncs payment status after client-side confirmation via get-payment-status", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createStripePaymentController();

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);

			// Session is pending
			expect(result.payment?.status).toBe("pending");

			// Simulate client-side Stripe.js confirmation
			const intentId = result.payment?.id;
			if (intentId) {
				await paymentCtrl.confirmIntent(intentId);
			}

			// Now get-payment-status should sync the succeeded status
			const statusResult = await simulateGetPaymentStatus(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);

			expect(statusResult.payment?.status).toBe("succeeded");

			// Session should be updated
			const updated = await checkoutCtrl.getById(session.id);
			expect(updated?.paymentStatus).toBe("succeeded");
		});

		it("allows order completion after client-side confirmation", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createStripePaymentController();

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);

			// Simulate Stripe.js confirmation
			const intentId = result.payment?.id;
			if (intentId) {
				await paymentCtrl.confirmIntent(intentId);
			}

			// Sync status
			await simulateGetPaymentStatus(checkoutCtrl, session.id, paymentCtrl);

			// Now complete should succeed
			const completeResult = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-STRIPE",
				paymentCtrl,
			);

			expect("session" in completeResult).toBe(true);
			if ("session" in completeResult) {
				expect(completeResult.session.status).toBe("completed");
			}
		});

		it("blocks completion when client-side confirmation has not occurred", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createStripePaymentController();

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(checkoutCtrl, session.id, paymentCtrl);

			// Don't confirm — try to complete directly
			const completeResult = await simulateCompleteWithPayment(
				checkoutCtrl,
				session.id,
				"ORD-NOCONFIRM",
				paymentCtrl,
			);

			expect("error" in completeResult).toBe(true);
			if ("error" in completeResult) {
				expect(completeResult.error).toContain(
					"Payment has not been completed",
				);
			}
		});

		it("cancels Stripe intent on session abandonment", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());
			const paymentCtrl = createStripePaymentController();

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateCreatePayment(
				checkoutCtrl,
				session.id,
				paymentCtrl,
			);
			const intentId = result.payment?.id;

			await simulateAbandonWithPayment(checkoutCtrl, session.id, paymentCtrl);

			// Verify cancelIntent was called
			const cancelCalls = paymentCtrl._calls.filter(
				(c) => c.method === "cancelIntent",
			);
			expect(cancelCalls).toHaveLength(1);
			expect(cancelCalls[0].id).toBe(intentId);

			const intent = intentId ? paymentCtrl._intents.get(intentId) : undefined;
			expect(intent?.status).toBe("cancelled");
		});

		it("get-payment-status returns null when no intent exists", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());
			const result = await simulateGetPaymentStatus(
				checkoutCtrl,
				session.id,
				undefined,
			);

			expect(result.payment).toBeNull();
		});

		it("get-payment-status returns demo status for demo intents", async () => {
			const checkoutCtrl = createCheckoutController(createMockDataService());

			const session = await checkoutCtrl.create(makeSession());
			await simulateCreatePayment(checkoutCtrl, session.id, undefined);

			const result = await simulateGetPaymentStatus(
				checkoutCtrl,
				session.id,
				undefined,
			);

			expect(result.payment?.id).toMatch(/^demo_/);
			expect(result.payment?.status).toBe("succeeded");
		});
	});
});
