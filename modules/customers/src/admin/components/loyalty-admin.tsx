"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useEffect, useState } from "react";

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
	orderId?: string;
	createdAt: string;
}

interface LoyaltyStats {
	totalCustomersWithPoints: number;
	totalPointsIssued: number;
	totalPointsRedeemed: number;
	totalPointsOutstanding: number;
	averageBalance: number;
	topCustomers: {
		customerId: string;
		email: string;
		name: string;
		balance: number;
	}[];
}

interface Customer {
	id: string;
	email: string;
	firstName?: string | null;
	lastName?: string | null;
}

function useLoyaltyApi() {
	const client = useModuleClient();
	return {
		stats: client.module("customers").admin["/admin/customers/loyalty/stats"],
		listCustomers: client.module("customers").admin["/admin/customers"],
	};
}

function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded bg-muted ${className}`}
			aria-hidden="true"
		/>
	);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p className="mt-1 font-semibold text-2xl">{String(value)}</p>
		</div>
	);
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function TransactionBadge({ type }: { type: string }) {
	const colors = {
		earn: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
		redeem: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
		adjust: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	};
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${colors[type as keyof typeof colors] ?? colors.adjust}`}
		>
			{type.charAt(0).toUpperCase() + type.slice(1)}
		</span>
	);
}

function CustomerLoyaltyModal({
	customer,
	onClose,
}: {
	customer: Customer;
	onClose: () => void;
}) {
	useEffect(() => {
		function handler(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onClose]);
	const [actionType, setActionType] = useState<
		"earn" | "redeem" | "adjust" | null
	>(null);
	const [points, setPoints] = useState("");
	const [reason, setReason] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const customerId = customer.id;

	const handleSubmit = async () => {
		if (!actionType || !points || !reason) return;
		const p = Number.parseInt(points, 10);
		if (Number.isNaN(p) || p === 0) return;

		setSubmitting(true);
		try {
			const endpoint =
				actionType === "earn"
					? `/admin/customers/${customerId}/loyalty/earn`
					: actionType === "redeem"
						? `/admin/customers/${customerId}/loyalty/redeem`
						: `/admin/customers/${customerId}/loyalty/adjust`;

			await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					points: actionType === "adjust" ? p : Math.abs(p),
					reason,
				}),
			});
			setPoints("");
			setReason("");
			setActionType(null);
			// Refresh by closing and reopening
			onClose();
		} finally {
			setSubmitting(false);
		}
	};

	// Fetch balance
	const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
	const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			fetch(`/admin/customers/${customerId}/loyalty`).then((r) => r.json()),
			fetch(`/admin/customers/${customerId}/loyalty/history?limit=20`).then(
				(r) => r.json(),
			),
		]).then(([balData, histData]) => {
			setBalance(balData.balance ?? null);
			setTransactions(histData.transactions ?? []);
			setLoading(false);
		});
	}, [customerId]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div
				role="dialog"
				aria-modal="true"
				className="mx-4 w-full max-w-lg rounded-lg bg-card p-6 shadow-xl"
			>
				<div className="mb-4 flex items-center justify-between">
					<h3 className="font-semibold text-lg">
						{customer.firstName} {customer.lastName} — Loyalty Points
					</h3>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="text-muted-foreground hover:text-foreground"
					>
						&times;
					</button>
				</div>

				{loading ? (
					<div className="mb-4 grid grid-cols-3 gap-3">
						{Array.from({ length: 3 }, (_, i) => (
							<div
								key={`sk-${i}`}
								className="rounded-lg border border-border bg-card p-4"
							>
								<Skeleton className="mb-2 h-3 w-16" />
								<Skeleton className="h-6 w-12" />
							</div>
						))}
					</div>
				) : (
					<>
						<div className="mb-4 grid grid-cols-3 gap-3">
							<StatCard label="Balance" value={balance?.balance ?? 0} />
							<StatCard label="Earned" value={balance?.totalEarned ?? 0} />
							<StatCard label="Redeemed" value={balance?.totalRedeemed ?? 0} />
						</div>

						<div className="mb-4 flex gap-2">
							<button
								type="button"
								onClick={() => setActionType("earn")}
								className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
							>
								+ Earn
							</button>
							<button
								type="button"
								onClick={() => setActionType("redeem")}
								className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
							>
								- Redeem
							</button>
							<button
								type="button"
								onClick={() => setActionType("adjust")}
								className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
							>
								Adjust
							</button>
						</div>

						{actionType && (
							<div className="mb-4 rounded border border-border p-3">
								<p className="mb-2 font-medium text-sm">
									{actionType === "earn"
										? "Add Points"
										: actionType === "redeem"
											? "Redeem Points"
											: "Adjust Points"}
								</p>
								<input
									type="number"
									placeholder={
										actionType === "adjust"
											? "Points (negative to deduct)"
											: "Points"
									}
									value={points}
									onChange={(e) => setPoints(e.target.value)}
									className="mb-2 w-full rounded border border-border bg-background px-3 py-1.5 text-sm"
								/>
								<input
									type="text"
									placeholder="Reason"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									className="mb-2 w-full rounded border border-border bg-background px-3 py-1.5 text-sm"
								/>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleSubmit}
										disabled={submitting}
										className="rounded bg-foreground px-3 py-1.5 text-background text-sm hover:opacity-90 disabled:opacity-50"
									>
										{submitting ? "Saving..." : "Submit"}
									</button>
									<button
										type="button"
										onClick={() => setActionType(null)}
										className="rounded border px-3 py-1.5 text-sm hover:bg-muted"
									>
										Cancel
									</button>
								</div>
							</div>
						)}

						<div>
							<h4 className="mb-2 font-medium text-muted-foreground text-sm">
								Recent Transactions
							</h4>
							{transactions.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No transactions yet
								</p>
							) : (
								<div className="max-h-48 space-y-2 overflow-y-auto">
									{transactions.map((t) => (
										<div
											key={t.id}
											className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
										>
											<div>
												<TransactionBadge type={t.type} />
												<span className="ml-2 text-foreground">{t.reason}</span>
											</div>
											<div className="text-right">
												<span
													className={
														t.points > 0
															? "font-medium text-green-600"
															: "font-medium text-red-600"
													}
												>
													{t.points > 0 ? "+" : ""}
													{t.points}
												</span>
												<p className="text-muted-foreground text-xs">
													{formatDate(t.createdAt)}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

export function LoyaltyAdmin() {
	const api = useLoyaltyApi();
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
		null,
	);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const { data: statsData, isLoading: statsLoading } = api.stats.useQuery(
		{},
	) as {
		data: { stats: LoyaltyStats } | undefined;
		isLoading: boolean;
	};

	const stats = statsData?.stats;

	const customerQuery: Record<string, string> = {
		page: String(page),
		limit: "20",
	};
	if (search) customerQuery.search = search;

	const {
		data: customersData,
		isLoading: customersLoading,
		isError: customersError,
		refetch: refetchCustomers,
	} = api.listCustomers.useQuery(customerQuery) as {
		data: { customers: Customer[]; total: number; pages: number } | undefined;
		isLoading: boolean;
		isError: boolean;
		refetch: () => void;
	};

	if (customersError) {
		return (
			<div
				role="alert"
				className="rounded-md border border-destructive/50 bg-destructive/10 p-4"
			>
				<p className="font-semibold text-destructive">
					Failed to load loyalty customers
				</p>
				<p className="mt-1 text-muted-foreground text-sm">
					Check your connection and try again.
				</p>
				<button
					type="button"
					onClick={() => refetchCustomers()}
					className="mt-3 rounded-md bg-destructive/20 px-3 py-1.5 font-medium text-destructive text-sm transition-colors hover:bg-destructive/30"
				>
					Try again
				</button>
			</div>
		);
	}

	const customers = customersData?.customers ?? [];
	const totalPages = customersData?.pages ?? 1;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-xl">Loyalty Program</h2>
				<p className="text-muted-foreground text-sm">
					Manage customer loyalty points and rewards
				</p>
			</div>

			{/* Stats */}
			{statsLoading ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-5">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="h-20 animate-pulse rounded-lg bg-muted"
						/>
					))}
				</div>
			) : stats ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-5">
					<StatCard
						label="Customers with Points"
						value={stats.totalCustomersWithPoints}
					/>
					<StatCard
						label="Total Issued"
						value={stats.totalPointsIssued.toLocaleString()}
					/>
					<StatCard
						label="Total Redeemed"
						value={stats.totalPointsRedeemed.toLocaleString()}
					/>
					<StatCard
						label="Outstanding"
						value={stats.totalPointsOutstanding.toLocaleString()}
					/>
					<StatCard
						label="Avg Balance"
						value={stats.averageBalance.toLocaleString()}
					/>
				</div>
			) : null}

			{/* Top Customers */}
			{stats && stats.topCustomers.length > 0 && (
				<div>
					<h3 className="mb-3 font-medium text-muted-foreground text-sm">
						Top Customers by Points Balance
					</h3>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-border border-b">
									<th
										scope="col"
										className="pb-2 font-medium text-muted-foreground"
									>
										Customer
									</th>
									<th
										scope="col"
										className="pb-2 font-medium text-muted-foreground"
									>
										Email
									</th>
									<th
										scope="col"
										className="pb-2 text-right font-medium text-muted-foreground"
									>
										Balance
									</th>
								</tr>
							</thead>
							<tbody>
								{stats.topCustomers.map((tc) => (
									<tr key={tc.customerId} className="border-border border-b">
										<td className="py-2">{tc.name}</td>
										<td className="py-2 text-muted-foreground">{tc.email}</td>
										<td className="py-2 text-right font-medium">
											{tc.balance.toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Customer Search + Manage */}
			<div>
				<h3 className="mb-3 font-medium text-muted-foreground text-sm">
					Manage Customer Points
				</h3>
				<input
					type="text"
					placeholder="Search customers..."
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
					className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
				/>

				{customersLoading ? (
					<p className="text-muted-foreground text-sm">Loading customers...</p>
				) : customers.length === 0 ? (
					<p className="text-muted-foreground text-sm">No customers found</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-border border-b">
										<th
											scope="col"
											className="pb-2 font-medium text-muted-foreground"
										>
											Name
										</th>
										<th
											scope="col"
											className="pb-2 font-medium text-muted-foreground"
										>
											Email
										</th>
										<th
											scope="col"
											className="pb-2 text-right font-medium text-muted-foreground"
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{customers.map((c) => (
										<tr key={c.id} className="border-border border-b">
											<td className="py-2">
												{c.firstName} {c.lastName}
											</td>
											<td className="py-2 text-muted-foreground">{c.email}</td>
											<td className="py-2 text-right">
												<button
													type="button"
													onClick={() => setSelectedCustomer(c)}
													className="rounded bg-muted px-3 py-1 font-medium text-xs hover:bg-muted/80"
												>
													Manage Points
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="mt-3 flex items-center justify-between">
								<button
									type="button"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50"
								>
									Previous
								</button>
								<span className="text-muted-foreground text-sm">
									Page {page} of {totalPages}
								</span>
								<button
									type="button"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50"
								>
									Next
								</button>
							</div>
						)}
					</>
				)}
			</div>

			{/* Customer Loyalty Modal */}
			{selectedCustomer && (
				<CustomerLoyaltyModal
					customer={selectedCustomer}
					onClose={() => setSelectedCustomer(null)}
				/>
			)}
		</div>
	);
}
