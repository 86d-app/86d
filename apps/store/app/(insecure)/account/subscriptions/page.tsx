"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import { StatusBadge } from "~/components/status-badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

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
		isError,
		refetch,
	} = subsApi.useQuery(email ? { email } : undefined, {
		enabled: !!email,
	}) as {
		data: { subscriptions: Subscription[] } | undefined;
		isLoading: boolean;
		isError: boolean;
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

			{isError ? (
				<div
					className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
					role="alert"
				>
					<p>Failed to load your subscriptions.</p>
					<button
						type="button"
						onClick={() => refetch()}
						className="mt-1 font-medium underline"
					>
						Try again
					</button>
				</div>
			) : isLoading || !email ? (
				<div className="flex flex-col gap-3">
					{[1, 2].map((n) => (
						<Skeleton key={n} className="h-28 rounded-xl" />
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
				<div className="flex flex-col gap-3">
					{subscriptions.map((sub) => {
						const isActive = ["active", "trialing"].includes(sub.status);

						return (
							<div key={sub.id} className="rounded-xl border border-border p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center gap-2">
											<p className="font-medium text-foreground text-sm">
												{sub.planId}
											</p>
											<StatusBadge status={sub.status} />
										</div>
										<div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
											<p>
												Current period: {formatDate(sub.currentPeriodStart)}{" "}
												&ndash; {formatDate(sub.currentPeriodEnd)}
											</p>
											{sub.trialEnd && (
												<p>Trial ends {formatDate(sub.trialEnd)}</p>
											)}
											{sub.cancelAtPeriodEnd && (
												<p className="font-medium text-status-warning">
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
											<Button
												variant="destructive"
												size="xs"
												disabled={cancellingId === sub.id}
												onClick={() => handleCancel(sub.id, false)}
											>
												Cancel now
											</Button>
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
