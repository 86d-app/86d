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

function StatCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
			<p className="text-neutral-500 text-sm dark:text-neutral-400">{label}</p>
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount only
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
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="font-semibold text-lg">
						{customer.firstName} {customer.lastName} — Loyalty Points
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-600"
					>
						&times;
					</button>
				</div>

				{loading ? (
					<p className="text-neutral-500">Loading...</p>
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
							<div className="mb-4 rounded border border-neutral-200 p-3 dark:border-neutral-700">
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
									className="mb-2 w-full rounded border px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
								/>
								<input
									type="text"
									placeholder="Reason"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									className="mb-2 w-full rounded border px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
								/>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleSubmit}
										disabled={submitting}
										className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black"
									>
										{submitting ? "Saving..." : "Submit"}
									</button>
									<button
										type="button"
										onClick={() => setActionType(null)}
										className="rounded border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
									>
										Cancel
									</button>
								</div>
							</div>
						)}

						<div>
							<h4 className="mb-2 font-medium text-neutral-500 text-sm">
								Recent Transactions
							</h4>
							{transactions.length === 0 ? (
								<p className="text-neutral-400 text-sm">No transactions yet</p>
							) : (
								<div className="max-h-48 space-y-2 overflow-y-auto">
									{transactions.map((t) => (
										<div
											key={t.id}
											className="flex items-center justify-between rounded border px-3 py-2 text-sm dark:border-neutral-700"
										>
											<div>
												<TransactionBadge type={t.type} />
												<span className="ml-2 text-neutral-600 dark:text-neutral-300">
													{t.reason}
												</span>
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
												<p className="text-neutral-400 text-xs">
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

	const { data: customersData, isLoading: customersLoading } =
		api.listCustomers.useQuery(customerQuery) as {
			data: { customers: Customer[]; total: number; pages: number } | undefined;
			isLoading: boolean;
		};

	const customers = customersData?.customers ?? [];
	const totalPages = customersData?.pages ?? 1;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-xl">Loyalty Program</h2>
				<p className="text-neutral-500 text-sm dark:text-neutral-400">
					Manage customer loyalty points and rewards
				</p>
			</div>

			{/* Stats */}
			{statsLoading ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-5">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
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
					<h3 className="mb-3 font-medium text-neutral-500 text-sm dark:text-neutral-400">
						Top Customers by Points Balance
					</h3>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b dark:border-neutral-700">
									<th className="pb-2 font-medium text-neutral-500">
										Customer
									</th>
									<th className="pb-2 font-medium text-neutral-500">Email</th>
									<th className="pb-2 text-right font-medium text-neutral-500">
										Balance
									</th>
								</tr>
							</thead>
							<tbody>
								{stats.topCustomers.map((tc) => (
									<tr
										key={tc.customerId}
										className="border-b dark:border-neutral-800"
									>
										<td className="py-2">{tc.name}</td>
										<td className="py-2 text-neutral-500">{tc.email}</td>
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
				<h3 className="mb-3 font-medium text-neutral-500 text-sm dark:text-neutral-400">
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
					className="mb-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
				/>

				{customersLoading ? (
					<p className="text-neutral-400 text-sm">Loading customers...</p>
				) : customers.length === 0 ? (
					<p className="text-neutral-400 text-sm">No customers found</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b dark:border-neutral-700">
										<th className="pb-2 font-medium text-neutral-500">Name</th>
										<th className="pb-2 font-medium text-neutral-500">Email</th>
										<th className="pb-2 text-right font-medium text-neutral-500">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{customers.map((c) => (
										<tr key={c.id} className="border-b dark:border-neutral-800">
											<td className="py-2">
												{c.firstName} {c.lastName}
											</td>
											<td className="py-2 text-neutral-500">{c.email}</td>
											<td className="py-2 text-right">
												<button
													type="button"
													onClick={() => setSelectedCustomer(c)}
													className="rounded bg-neutral-100 px-3 py-1 font-medium text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
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
									className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
								>
									Previous
								</button>
								<span className="text-neutral-500 text-sm">
									Page {page} of {totalPages}
								</span>
								<button
									type="button"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
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
