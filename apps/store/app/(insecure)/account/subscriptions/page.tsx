"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface Subscription {
	id: string;
	planId: string;
	email: string;
	customerId?: string | undefined;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	cancelledAt?: string | undefined;
	trialEnd?: string | undefined;
	createdAt: string;
}

interface Customer {
	id: string;
	email: string;
	firstName?: string | undefined;
	lastName?: string | undefined;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

const STATUS_STYLES: Record<string, string> = {
	active:
		"bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	trialing: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	past_due:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	cancelled: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
	expired: "bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
	paused:
		"bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
};

// ── Subscriptions Page ──────────────────────────────────────────────────────

export default function SubscriptionsPage() {
	const client = useModuleClient();

	const customerApi = client.module("customers").store["/customers/me"];
	const { data: customerData } = customerApi.useQuery() as {
		data: { customer: Customer } | undefined;
	};

	const email = customerData?.customer?.email;

	const subsApi = client.module("subscriptions").store["/subscriptions/me"];
	const cancelApi =
		client.module("subscriptions").store["/subscriptions/me/cancel"];

	const {
		data: subsData,
		isLoading,
		refetch,
	} = subsApi.useQuery(email ? { email } : undefined, {
		enabled: !!email,
	}) as {
		data: { subscriptions: Subscription[] } | undefined;
		isLoading: boolean;
		refetch: () => void;
	};

	const [cancellingId, setCancellingId] = useState<string | null>(null);
	const [error, setError] = useState("");

	const subscriptions = subsData?.subscriptions ?? [];

	async function handleCancel(id: string, atPeriodEnd: boolean) {
		setCancellingId(id);
		setError("");
		try {
			await cancelApi.fetch({
				method: "POST",
				body: { id, cancelAtPeriodEnd: atPeriodEnd },
			});
			refetch();
		} catch {
			setError("Failed to cancel subscription. Please try again.");
		} finally {
			setCancellingId(null);
		}
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="font-bold font-display text-foreground text-xl tracking-tight sm:text-2xl">
					My Subscriptions
				</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage your active subscriptions.
				</p>
			</div>

			{error && (
				<div
					className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
					role="alert"
				>
					{error}
				</div>
			)}

			{isLoading || !email ? (
				<div className="space-y-3">
					{[1, 2].map((n) => (
						<div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />
					))}
				</div>
			) : subscriptions.length === 0 ? (
				<div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
					<div className="mb-4 flex justify-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-muted-foreground"
								aria-hidden="true"
							>
								<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
								<path d="m9 12 2 2 4-4" />
							</svg>
						</div>
					</div>
					<p className="font-medium text-foreground text-sm">
						No subscriptions
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						You don&apos;t have any active subscriptions.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{subscriptions.map((sub) => {
						const isActive = ["active", "trialing"].includes(sub.status);
						const colorClass =
							STATUS_STYLES[sub.status] ??
							"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

						return (
							<div key={sub.id} className="rounded-xl border border-border p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center gap-2">
											<p className="font-medium text-foreground text-sm">
												{sub.planId}
											</p>
											<span
												className={`inline-block rounded-full px-2 py-0.5 font-medium text-xs capitalize ${colorClass}`}
											>
												{sub.status.replace(/_/g, " ")}
											</span>
										</div>
										<div className="space-y-0.5 text-muted-foreground text-xs">
											<p>
												Current period: {formatDate(sub.currentPeriodStart)}{" "}
												&ndash; {formatDate(sub.currentPeriodEnd)}
											</p>
											{sub.trialEnd && (
												<p>Trial ends {formatDate(sub.trialEnd)}</p>
											)}
											{sub.cancelAtPeriodEnd && (
												<p className="font-medium text-yellow-700 dark:text-yellow-300">
													Cancels at end of period
												</p>
											)}
											{sub.cancelledAt && (
												<p>Cancelled {formatDate(sub.cancelledAt)}</p>
											)}
											<p>Started {formatDate(sub.createdAt)}</p>
										</div>
									</div>
									{isActive && !sub.cancelAtPeriodEnd && (
										<div className="flex shrink-0 flex-col gap-2">
											<button
												type="button"
												disabled={cancellingId === sub.id}
												onClick={() => handleCancel(sub.id, true)}
												className="rounded-lg border border-border px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-muted disabled:opacity-60"
											>
												Cancel at period end
											</button>
											<button
												type="button"
												disabled={cancellingId === sub.id}
												onClick={() => handleCancel(sub.id, false)}
												className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 text-xs transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
											>
												Cancel now
											</button>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
