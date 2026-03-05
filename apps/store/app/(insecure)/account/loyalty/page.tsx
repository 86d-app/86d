"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface LoyaltyBalance {
	customerId: string;
	totalEarned: number;
	totalRedeemed: number;
	balance: number;
	transactionCount: number;
}

interface LoyaltyTransaction {
	id: string;
	customerId: string;
	type: "earn" | "redeem" | "adjust";
	points: number;
	balance: number;
	reason: string;
	orderId?: string | undefined;
	createdAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

function formatNumber(n: number): string {
	return new Intl.NumberFormat("en-US").format(n);
}

function transactionLabel(type: "earn" | "redeem" | "adjust"): string {
	switch (type) {
		case "earn":
			return "Earned";
		case "redeem":
			return "Redeemed";
		case "adjust":
			return "Adjustment";
	}
}

function transactionColor(
	type: "earn" | "redeem" | "adjust",
	points: number,
): string {
	if (type === "earn" || (type === "adjust" && points > 0)) {
		return "text-emerald-600 dark:text-emerald-400";
	}
	return "text-red-600 dark:text-red-400";
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	sub,
}: {
	label: string;
	value: string;
	sub?: string | undefined;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="mt-1 font-bold font-display text-2xl text-foreground tracking-tight">
				{value}
			</p>
			{sub && <p className="mt-0.5 text-muted-foreground text-xs">{sub}</p>}
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function LoyaltyPage() {
	const client = useModuleClient();
	const [page, setPage] = useState(0);

	const balanceApi = client.module("customers").store["/customers/me/loyalty"];
	const historyApi =
		client.module("customers").store["/customers/me/loyalty/history"];

	const { data: balanceData, isLoading: balanceLoading } =
		balanceApi.useQuery() as {
			data: { balance: LoyaltyBalance } | undefined;
			isLoading: boolean;
		};

	const { data: historyData, isLoading: historyLoading } = historyApi.useQuery({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
	}) as {
		data: { transactions: LoyaltyTransaction[]; total: number } | undefined;
		isLoading: boolean;
	};

	const balance = balanceData?.balance;
	const transactions = historyData?.transactions ?? [];
	const total = historyData?.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);
	const isLoading = balanceLoading || historyLoading;

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<h2 className="font-bold font-display text-foreground text-xl tracking-tight sm:text-2xl">
					Loyalty Points
				</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Earn points with every purchase, redeem them for rewards.
				</p>
			</div>

			{/* Stats */}
			{isLoading && !balance ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[1, 2, 3, 4].map((n) => (
						<div key={n} className="h-24 animate-pulse rounded-xl bg-muted" />
					))}
				</div>
			) : balance ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<StatCard
						label="Available Points"
						value={formatNumber(balance.balance)}
					/>
					<StatCard
						label="Total Earned"
						value={formatNumber(balance.totalEarned)}
					/>
					<StatCard
						label="Total Redeemed"
						value={formatNumber(balance.totalRedeemed)}
					/>
					<StatCard
						label="Transactions"
						value={formatNumber(balance.transactionCount)}
					/>
				</div>
			) : null}

			{/* How it works */}
			{balance && balance.transactionCount === 0 && (
				<div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
					<h3 className="font-semibold text-foreground text-sm">
						How to earn points
					</h3>
					<ul className="mt-2 space-y-1.5 text-muted-foreground text-sm">
						<li className="flex items-start gap-2">
							<span className="mt-0.5 shrink-0 text-emerald-500">+</span>
							Place orders — earn points on every purchase
						</li>
						<li className="flex items-start gap-2">
							<span className="mt-0.5 shrink-0 text-emerald-500">+</span>
							Write reviews — share your experience to earn points
						</li>
						<li className="flex items-start gap-2">
							<span className="mt-0.5 shrink-0 text-emerald-500">+</span>
							Special promotions — bonus point events
						</li>
					</ul>
				</div>
			)}

			{/* Transaction History */}
			<div className="mt-8">
				<h3 className="mb-4 font-semibold text-foreground text-sm">
					Transaction History
				</h3>

				{isLoading && transactions.length === 0 ? (
					<div className="space-y-2">
						{[1, 2, 3].map((n) => (
							<div key={n} className="h-14 animate-pulse rounded-lg bg-muted" />
						))}
					</div>
				) : transactions.length === 0 ? (
					<div className="rounded-xl border border-border bg-muted/30 py-10 text-center">
						<div className="mb-3 flex justify-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-muted-foreground"
									aria-hidden="true"
								>
									<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
								</svg>
							</div>
						</div>
						<p className="font-medium text-foreground text-sm">
							No transactions yet
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Start shopping to earn your first loyalty points.
						</p>
						<a
							href="/products"
							className="mt-4 inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2 font-semibold text-background text-sm transition-opacity hover:opacity-90"
						>
							Browse products
						</a>
					</div>
				) : (
					<>
						<div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
							{transactions.map((tx) => (
								<div
									key={tx.id}
									className="flex items-center justify-between gap-4 px-4 py-3"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span
												className={`inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${
													tx.type === "earn"
														? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
														: tx.type === "redeem"
															? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
															: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
												}`}
											>
												{transactionLabel(tx.type)}
											</span>
											<span className="text-muted-foreground text-xs">
												{formatDate(tx.createdAt)}
											</span>
										</div>
										<p className="mt-0.5 truncate text-muted-foreground text-sm">
											{tx.reason}
										</p>
									</div>
									<div className="text-right">
										<p
											className={`font-semibold text-sm ${transactionColor(tx.type, tx.points)}`}
										>
											{tx.points > 0 ? "+" : ""}
											{formatNumber(tx.points)} pts
										</p>
										<p className="text-muted-foreground text-xs">
											Balance: {formatNumber(tx.balance)}
										</p>
									</div>
								</div>
							))}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="mt-4 flex items-center justify-between">
								<p className="text-muted-foreground text-sm">
									Page {page + 1} of {totalPages}
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										disabled={page === 0}
										onClick={() => setPage((p) => Math.max(0, p - 1))}
										className="rounded-lg border border-border px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
									>
										Previous
									</button>
									<button
										type="button"
										disabled={page >= totalPages - 1}
										onClick={() => setPage((p) => p + 1)}
										className="rounded-lg border border-border px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
