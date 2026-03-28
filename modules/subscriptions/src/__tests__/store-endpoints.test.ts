import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import type { SubscriptionController } from "../service";
import { createSubscriptionController } from "../service-impl";

/**
 * Store endpoint integration tests for the subscriptions module.
 *
 * Tests verify:
 *
 * 1. subscribe — auth, plan existence, plan active check, trial handling
 * 2. get-my-subscriptions — auth, scoped to customer
 * 3. cancel — auth, ownership, immediate vs. end-of-period cancellation
 */

type DataService = ReturnType<typeof createMockDataService>;

// ── Simulate endpoint logic ─────────────────────────────────────────────

async function simulateSubscribe(
	controller: SubscriptionController,
	body: { planId: string },
	session: { userId: string; email: string } | null,
) {
	if (!session) return { error: "Unauthorized", status: 401 };

	const plan = await controller.getPlan(body.planId);
	if (!plan) return { error: "Plan not found", status: 404 };
	if (!plan.isActive) return { error: "Plan is not active", status: 400 };

	const subscription = await controller.subscribe({
		planId: body.planId,
		customerId: session.userId,
		email: session.email,
	});
	return { subscription };
}

async function simulateGetMySubscriptions(
	controller: SubscriptionController,
	session: { userId: string; email: string } | null,
) {
	if (!session) return { error: "Unauthorized", status: 401 };
	const subscriptions = await controller.listSubscriptions({
		email: session.email,
	});
	return { subscriptions };
}

async function simulateCancel(
	controller: SubscriptionController,
	body: { id: string; cancelAtPeriodEnd?: boolean },
	session: { userId: string } | null,
) {
	if (!session) return { error: "Unauthorized", status: 401 };
	const existing = await controller.getSubscription(body.id);
	if (!existing || existing.customerId !== session.userId) {
		return { error: "Not found", status: 404 };
	}
	const subscription = await controller.cancelSubscription({
		id: body.id,
		cancelAtPeriodEnd: body.cancelAtPeriodEnd,
	});
	return { subscription };
}

// ── Tests ───────────────────────────────────────────────────────────────

let data: DataService;
let controller: SubscriptionController;

beforeEach(() => {
	data = createMockDataService();
	controller = createSubscriptionController(data);
});

const session = { userId: "cust_1", email: "cust@example.com" };

describe("subscribe (POST /subscriptions/subscribe)", () => {
	it("requires authentication", async () => {
		const result = await simulateSubscribe(
			controller,
			{ planId: "plan_1" },
			null,
		);
		expect(result).toEqual({ error: "Unauthorized", status: 401 });
	});

	it("creates subscription for an active plan", async () => {
		const plan = await controller.createPlan({
			name: "Monthly",
			price: 999,
			interval: "month",
		});

		const result = await simulateSubscribe(
			controller,
			{ planId: plan.id },
			session,
		);
		expect("subscription" in result).toBe(true);
		if ("subscription" in result && result.subscription) {
			expect(result.subscription.planId).toBe(plan.id);
			expect(result.subscription.status).toBe("active");
			expect(result.subscription.email).toBe("cust@example.com");
			expect(result.subscription.customerId).toBe("cust_1");
		}
	});

	it("starts with trialing status when plan has trial days", async () => {
		const plan = await controller.createPlan({
			name: "Trial Plan",
			price: 1999,
			interval: "month",
			trialDays: 14,
		});

		const result = await simulateSubscribe(
			controller,
			{ planId: plan.id },
			session,
		);
		if ("subscription" in result && result.subscription) {
			expect(result.subscription.status).toBe("trialing");
			expect(result.subscription.trialStart).toBeDefined();
			expect(result.subscription.trialEnd).toBeDefined();
		}
	});

	it("returns 404 for non-existent plan", async () => {
		const result = await simulateSubscribe(
			controller,
			{ planId: "nonexistent" },
			session,
		);
		expect(result).toEqual({ error: "Plan not found", status: 404 });
	});

	it("returns 400 for inactive plan", async () => {
		const plan = await controller.createPlan({
			name: "Retired",
			price: 500,
			interval: "year",
			isActive: false,
		});

		const result = await simulateSubscribe(
			controller,
			{ planId: plan.id },
			session,
		);
		expect(result).toEqual({ error: "Plan is not active", status: 400 });
	});
});

describe("get-my-subscriptions (GET /subscriptions/me)", () => {
	it("requires authentication", async () => {
		const result = await simulateGetMySubscriptions(controller, null);
		expect(result).toEqual({ error: "Unauthorized", status: 401 });
	});

	it("returns subscriptions for the authenticated user's email", async () => {
		const plan = await controller.createPlan({
			name: "Pro",
			price: 2999,
			interval: "month",
		});

		await controller.subscribe({
			planId: plan.id,
			customerId: "cust_1",
			email: "cust@example.com",
		});
		await controller.subscribe({
			planId: plan.id,
			customerId: "cust_2",
			email: "other@example.com",
		});

		const result = await simulateGetMySubscriptions(controller, session);
		expect("subscriptions" in result).toBe(true);
		if ("subscriptions" in result) {
			expect(result.subscriptions).toHaveLength(1);
			expect(result.subscriptions[0].email).toBe("cust@example.com");
		}
	});

	it("returns empty list when user has no subscriptions", async () => {
		const result = await simulateGetMySubscriptions(controller, session);
		if ("subscriptions" in result) {
			expect(result.subscriptions).toHaveLength(0);
		}
	});
});

describe("cancel (POST /subscriptions/me/cancel)", () => {
	it("requires authentication", async () => {
		const result = await simulateCancel(controller, { id: "sub_1" }, null);
		expect(result).toEqual({ error: "Unauthorized", status: 401 });
	});

	it("cancels subscription immediately", async () => {
		const plan = await controller.createPlan({
			name: "Basic",
			price: 499,
			interval: "month",
		});
		const sub = await controller.subscribe({
			planId: plan.id,
			customerId: "cust_1",
			email: "cust@example.com",
		});

		const result = await simulateCancel(
			controller,
			{ id: sub.id },
			{ userId: "cust_1" },
		);
		expect("subscription" in result).toBe(true);
		if ("subscription" in result && result.subscription) {
			expect(result.subscription.status).toBe("cancelled");
			expect(result.subscription.cancelledAt).toBeDefined();
		}
	});

	it("cancels at period end when requested", async () => {
		const plan = await controller.createPlan({
			name: "Basic",
			price: 499,
			interval: "month",
		});
		const sub = await controller.subscribe({
			planId: plan.id,
			customerId: "cust_1",
			email: "cust@example.com",
		});

		const result = await simulateCancel(
			controller,
			{ id: sub.id, cancelAtPeriodEnd: true },
			{ userId: "cust_1" },
		);
		if ("subscription" in result && result.subscription) {
			expect(result.subscription.cancelAtPeriodEnd).toBe(true);
			// Status remains active until period ends
			expect(result.subscription.status).toBe("active");
		}
	});

	it("returns 404 for another customer's subscription", async () => {
		const plan = await controller.createPlan({
			name: "Basic",
			price: 499,
			interval: "month",
		});
		const sub = await controller.subscribe({
			planId: plan.id,
			customerId: "cust_1",
			email: "cust@example.com",
		});

		const result = await simulateCancel(
			controller,
			{ id: sub.id },
			{ userId: "cust_2" },
		);
		expect(result).toEqual({ error: "Not found", status: 404 });
	});

	it("returns 404 for non-existent subscription", async () => {
		const result = await simulateCancel(
			controller,
			{ id: "nonexistent" },
			{ userId: "cust_1" },
		);
		expect(result).toEqual({ error: "Not found", status: 404 });
	});
});

describe("cross-endpoint lifecycle", () => {
	it("subscribe → list → cancel → list shows cancelled", async () => {
		const plan = await controller.createPlan({
			name: "Premium",
			price: 4999,
			interval: "year",
		});

		// Subscribe
		const subResult = await simulateSubscribe(
			controller,
			{ planId: plan.id },
			session,
		);
		expect("subscription" in subResult).toBe(true);
		const subId =
			"subscription" in subResult ? subResult.subscription?.id : undefined;
		expect(subId).toBeDefined();

		// List shows active subscription
		const listed = await simulateGetMySubscriptions(controller, session);
		if ("subscriptions" in listed) {
			expect(listed.subscriptions).toHaveLength(1);
			expect(listed.subscriptions[0].status).toBe("active");
		}

		// Cancel
		const cancelled = await simulateCancel(
			controller,
			{ id: subId as string },
			{ userId: "cust_1" },
		);
		if ("subscription" in cancelled && cancelled.subscription) {
			expect(cancelled.subscription.status).toBe("cancelled");
		}

		// List still shows it (now cancelled)
		const afterCancel = await simulateGetMySubscriptions(controller, session);
		if ("subscriptions" in afterCancel) {
			expect(afterCancel.subscriptions).toHaveLength(1);
			expect(afterCancel.subscriptions[0].status).toBe("cancelled");
		}
	});
});
