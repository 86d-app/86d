"use client";

import { formatDate, STATUS_STYLES } from "./_utils";
import SubscriptionCardTemplate from "./subscription-card.mdx";

interface Subscription {
	id: string;
	planId: string;
	email: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	trialStart?: string | undefined;
	trialEnd?: string | undefined;
	cancelledAt?: string | undefined;
	cancelAtPeriodEnd: boolean;
	createdAt: string;
}

export function SubscriptionCard({
	subscription,
	cancelling,
	onCancel,
}: {
	subscription: Subscription;
	cancelling: boolean;
	onCancel: (atPeriodEnd: boolean) => void;
}) {
	const isActive = ["active", "trialing"].includes(subscription.status);
	const statusStyle =
		STATUS_STYLES[subscription.status] ??
		"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

	return (
		<SubscriptionCardTemplate
			planIdPreview={subscription.planId.slice(0, 8)}
			statusStyle={statusStyle}
			statusLabel={subscription.status.replace(/_/g, " ")}
			periodStartFormatted={formatDate(subscription.currentPeriodStart)}
			periodEndFormatted={formatDate(subscription.currentPeriodEnd)}
			trialEndFormatted={
				subscription.trialEnd ? formatDate(subscription.trialEnd) : undefined
			}
			cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
			cancelledAtFormatted={
				subscription.cancelledAt
					? formatDate(subscription.cancelledAt)
					: undefined
			}
			showCancelButtons={isActive && !subscription.cancelAtPeriodEnd}
			cancelling={cancelling}
			onCancel={onCancel}
		/>
	);
}
