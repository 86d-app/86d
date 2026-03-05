import type { ModuleController } from "@86d-app/core";

export type SubscriptionInterval = "day" | "week" | "month" | "year";
export type SubscriptionStatus =
	| "active"
	| "trialing"
	| "cancelled"
	| "expired"
	| "past_due";

export interface SubscriptionPlan {
	id: string;
	name: string;
	description?: string | undefined;
	price: number;
	currency: string;
	interval: SubscriptionInterval;
	intervalCount: number;
	trialDays?: number | undefined;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Subscription {
	id: string;
	planId: string;
	customerId?: string | undefined;
	email: string;
	status: SubscriptionStatus;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	trialStart?: Date | undefined;
	trialEnd?: Date | undefined;
	cancelledAt?: Date | undefined;
	cancelAtPeriodEnd: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface SubscriptionController extends ModuleController {
	// ── Plans ─────────────────────────────────────────────────────────────
	createPlan(params: {
		name: string;
		description?: string | undefined;
		price: number;
		currency?: string | undefined;
		interval: SubscriptionInterval;
		intervalCount?: number | undefined;
		trialDays?: number | undefined;
		isActive?: boolean | undefined;
	}): Promise<SubscriptionPlan>;

	getPlan(id: string): Promise<SubscriptionPlan | null>;

	listPlans(params?: {
		activeOnly?: boolean | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<SubscriptionPlan[]>;

	updatePlan(
		id: string,
		params: {
			name?: string | undefined;
			description?: string | undefined;
			price?: number | undefined;
			trialDays?: number | undefined;
			isActive?: boolean | undefined;
		},
	): Promise<SubscriptionPlan | null>;

	deletePlan(id: string): Promise<boolean>;

	// ── Subscriptions ──────────────────────────────────────────────────────
	subscribe(params: {
		planId: string;
		email: string;
		customerId?: string | undefined;
	}): Promise<Subscription>;

	getSubscription(id: string): Promise<Subscription | null>;

	getSubscriptionByEmail(params: {
		email: string;
		planId?: string | undefined;
	}): Promise<Subscription | null>;

	cancelSubscription(params: {
		id: string;
		cancelAtPeriodEnd?: boolean | undefined;
	}): Promise<Subscription | null>;

	renewSubscription(id: string): Promise<Subscription | null>;

	expireSubscriptions(): Promise<number>;

	listSubscriptions(params?: {
		email?: string | undefined;
		planId?: string | undefined;
		status?: SubscriptionStatus | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Subscription[]>;
}
