import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import type {
	PaymentProcessController,
	SubscriptionController,
} from "../service";
import { createSubscriptionController } from "../service-impl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DataService = ReturnType<typeof createMockDataService>;

function createMockPaymentController(opts?: {
	status?: string;
	notFound?: boolean;
}): PaymentProcessController {
	return {
		async getIntent(id) {
			if (opts?.notFound) return null;
			return {
				id,
				status: opts?.status ?? "succeeded",
				amount: 2999,
				currency: "USD",
			};
		},
	};
}

const session = { userId: "cust_1", email: "cust@example.com" };

/**
 * Simulates the subscribe endpoint logic matching the real implementation.
 */
async function simulateSubscribeWithPayment(
	controller: SubscriptionController,
	body: { planId: string; paymentIntentId?: string | undefined },
	opts?: {
		userSession?: { userId: string; email: string } | null;
		paymentController?: PaymentProcessController | undefined;
	},
) {
	const userSession = opts?.userSession ?? session;
	if (!userSession) return { error: "Authentication required", status: 401 };

	const plan = await controller.getPlan(body.planId);
	if (!plan) return { error: "Plan not found", status: 404 };
	if (!plan.isActive) return { error: "Plan is not active", status: 400 };

	const hasTrial = plan.trialDays !== undefined && plan.trialDays > 0;
	const requiresPayment = plan.price > 0 && !hasTrial;

	if (requiresPayment) {
		if (!body.paymentIntentId) {
			return {
				error:
					"A completed payment intent is required to subscribe to this plan",
				status: 400,
			};
		}

		if (opts?.paymentController) {
			const intent = await opts.paymentController.getIntent(
				body.paymentIntentId,
			);
			if (!intent) {
				return { error: "Payment intent not found", status: 404 };
			}
			if (intent.status !== "succeeded") {
				return {
					error: `Payment has not been completed (status: ${intent.status})`,
					status: 422,
				};
			}
		}
	}

	const subscription = await controller.subscribe({
		planId: body.planId,
		email: userSession.email,
		customerId: userSession.userId,
		...(body.paymentIntentId ? { paymentIntentId: body.paymentIntentId } : {}),
	});
	return { subscription };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let data: DataService;
let controller: SubscriptionController;

beforeEach(() => {
	data = createMockDataService();
	controller = createSubscriptionController(data);
});

describe("subscribe endpoint — payment requirements", () => {
	it("allows subscribing to a free plan without payment", async () => {
		const plan = await controller.createPlan({
			name: "Free",
			price: 0,
			interval: "month",
		});

		const result = await simulateSubscribeWithPayment(controller, {
			planId: plan.id,
		});

		expect("subscription" in result).toBe(true);
		if ("subscription" in result) {
			expect(result.subscription.status).toBe("active");
		}
	});

	it("allows subscribing to a paid plan with trial without payment", async () => {
		const plan = await controller.createPlan({
			name: "Pro Trial",
			price: 2999,
			interval: "month",
			trialDays: 14,
		});

		const result = await simulateSubscribeWithPayment(controller, {
			planId: plan.id,
		});

		expect("subscription" in result).toBe(true);
		if ("subscription" in result) {
			expect(result.subscription.status).toBe("trialing");
			expect(result.subscription.paymentIntentId).toBeUndefined();
		}
	});

	it("rejects subscribing to a paid plan without payment intent", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		const result = await simulateSubscribeWithPayment(controller, {
			planId: plan.id,
		});

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toContain("payment intent is required");
			expect(result.status).toBe(400);
		}
	});

	it("rejects subscribing when payment intent is not found", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		const result = await simulateSubscribeWithPayment(
			controller,
			{ planId: plan.id, paymentIntentId: "pi_ghost" },
			{ paymentController: createMockPaymentController({ notFound: true }) },
		);

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe("Payment intent not found");
			expect(result.status).toBe(404);
		}
	});

	it("rejects subscribing when payment intent is not succeeded", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		const result = await simulateSubscribeWithPayment(
			controller,
			{ planId: plan.id, paymentIntentId: "pi_pending" },
			{
				paymentController: createMockPaymentController({
					status: "processing",
				}),
			},
		);

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toContain("Payment has not been completed");
			expect(result.error).toContain("processing");
			expect(result.status).toBe(422);
		}
	});

	it("creates subscription with paymentIntentId when payment succeeds", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		const result = await simulateSubscribeWithPayment(
			controller,
			{ planId: plan.id, paymentIntentId: "pi_success_123" },
			{
				paymentController: createMockPaymentController({ status: "succeeded" }),
			},
		);

		expect("subscription" in result).toBe(true);
		if ("subscription" in result) {
			expect(result.subscription.status).toBe("active");
			expect(result.subscription.paymentIntentId).toBe("pi_success_123");
		}
	});

	it("proceeds without verification when no payments module is installed", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		// No paymentController provided — simulates no payments module installed
		const result = await simulateSubscribeWithPayment(
			controller,
			{ planId: plan.id, paymentIntentId: "pi_unverified" },
			{ paymentController: undefined },
		);

		// Should succeed (best-effort when payments module not installed)
		expect("subscription" in result).toBe(true);
		if ("subscription" in result) {
			expect(result.subscription.paymentIntentId).toBe("pi_unverified");
		}
	});
});

describe("subscribe endpoint — paymentIntentId stored on subscription", () => {
	it("stores paymentIntentId on the subscription record", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		const sub = await controller.subscribe({
			planId: plan.id,
			email: "cust@example.com",
			paymentIntentId: "pi_stored_123",
		});

		expect(sub.paymentIntentId).toBe("pi_stored_123");

		// Persists in data layer
		const fetched = await controller.getSubscription(sub.id);
		expect(fetched?.paymentIntentId).toBe("pi_stored_123");
	});

	it("subscription without payment has no paymentIntentId", async () => {
		const plan = await controller.createPlan({
			name: "Free",
			price: 0,
			interval: "month",
		});

		const sub = await controller.subscribe({
			planId: plan.id,
			email: "cust@example.com",
		});

		expect(sub.paymentIntentId).toBeUndefined();
	});
});
