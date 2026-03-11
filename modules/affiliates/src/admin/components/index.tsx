"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Affiliate {
	id: string;
	name: string;
	email: string;
	website?: string;
	status: string;
	commissionRate: number;
	notes?: string;
	customerId?: string;
	createdAt: string;
	updatedAt: string;
}

interface AffiliateStats {
	totalAffiliates: number;
	activeAffiliates: number;
	pendingAffiliates: number;
	totalConversions: number;
	totalRevenue: number;
}

interface Conversion {
	id: string;
	affiliateId: string;
	orderId?: string;
	amount: number;
	commission: number;
	status: string;
	createdAt: string;
}

interface Payout {
	id: string;
	affiliateId: string;
	amount: number;
	method: string;
	reference?: string;
	status: string;
	notes?: string;
	createdAt: string;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useAffiliatesApi() {
	const client = useModuleClient();
	return {
		listAffiliates: client.module("affiliates").admin["/admin/affiliates"],
		stats: client.module("affiliates").admin["/admin/affiliates/stats"],
		getAffiliate: client.module("affiliates").admin["/admin/affiliates/:id"],
		approveAffiliate:
			client.module("affiliates").admin["/admin/affiliates/:id/approve"],
		suspendAffiliate:
			client.module("affiliates").admin["/admin/affiliates/:id/suspend"],
		rejectAffiliate:
			client.module("affiliates").admin["/admin/affiliates/:id/reject"],
		listConversions:
			client.module("affiliates").admin["/admin/affiliates/conversions"],
		approveConversion:
			client.module("affiliates").admin[
				"/admin/affiliates/conversions/:id/approve"
			],
		rejectConversion:
			client.module("affiliates").admin[
				"/admin/affiliates/conversions/:id/reject"
			],
		listPayouts: client.module("affiliates").admin["/admin/affiliates/payouts"],
		createPayout:
			client.module("affiliates").admin["/admin/affiliates/payouts/create"],
		completePayout:
			client.module("affiliates").admin[
				"/admin/affiliates/payouts/:id/complete"
			],
		failPayout:
			client.module("affiliates").admin["/admin/affiliates/payouts/:id/fail"],
		listLinks: client.module("affiliates").admin["/admin/affiliates/links"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	approved:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	rejected: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const CONVERSION_STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	approved:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PAYOUT_STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	processing:
		"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	completed:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatCurrency(amount: number) {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

// ---------------------------------------------------------------------------
// AffiliateList — main affiliate list with stats + actions
// ---------------------------------------------------------------------------

export function AffiliateList() {
	const api = useAffiliatesApi();
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.listAffiliates.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { affiliates?: Affiliate[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: AffiliateStats } | undefined;
	};

	const approveMutation = api.approveAffiliate.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const suspendMutation = api.suspendAffiliate.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const rejectMutation = api.rejectAffiliate.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const affiliates = data?.affiliates ?? [];
	const stats = statsData?.stats;

	const handleApprove = async (id: string) => {
		try {
			await approveMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleSuspend = async (id: string) => {
		try {
			await suspendMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleReject = async (id: string) => {
		try {
			await rejectMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">Affiliates</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage affiliate partners
				</p>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalAffiliates}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Active
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.activeAffiliates}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{stats.pendingAffiliates}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Conversions
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalConversions}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Revenue
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{formatCurrency(stats.totalRevenue)}
						</p>
					</div>
				</div>
			) : null}

			{/* Filter */}
			<div className="mb-4">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="pending">Pending</option>
					<option value="approved">Approved</option>
					<option value="suspended">Suspended</option>
					<option value="rejected">Rejected</option>
				</select>
			</div>

			{/* Affiliate list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : affiliates.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No affiliates found.</p>
				</div>
			) : (
				<div className="space-y-3">
					{affiliates.map((aff) => (
						<div
							key={aff.id}
							className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{aff.name}
										</p>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[aff.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{aff.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{aff.email}</span>
										<span>Commission: {aff.commissionRate}%</span>
										{aff.website ? <span>{aff.website}</span> : null}
									</div>
								</div>
								<div className="flex gap-1">
									{aff.status === "pending" ? (
										<>
											<button
												type="button"
												onClick={() => handleApprove(aff.id)}
												className="rounded bg-green-50 px-2 py-1 text-green-700 text-xs hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
											>
												Approve
											</button>
											<button
												type="button"
												onClick={() => handleReject(aff.id)}
												className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
											>
												Reject
											</button>
										</>
									) : null}
									{aff.status === "approved" ? (
										<button
											type="button"
											onClick={() => handleSuspend(aff.id)}
											className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
										>
											Suspend
										</button>
									) : null}
									{aff.status === "suspended" ? (
										<button
											type="button"
											onClick={() => handleApprove(aff.id)}
											className="rounded bg-green-50 px-2 py-1 text-green-700 text-xs hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
										>
											Reactivate
										</button>
									) : null}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// ApplicationList — pending affiliate applications
// ---------------------------------------------------------------------------

export function ApplicationList() {
	const api = useAffiliatesApi();

	const { data, isLoading } = api.listAffiliates.useQuery({
		status: "pending",
	}) as {
		data: { affiliates?: Affiliate[]; total?: number } | undefined;
		isLoading: boolean;
	};

	const approveMutation = api.approveAffiliate.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const rejectMutation = api.rejectAffiliate.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const affiliates = data?.affiliates ?? [];

	const handleApprove = async (id: string) => {
		try {
			await approveMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleReject = async (id: string) => {
		try {
			await rejectMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">
					Affiliate Applications
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Review pending affiliate applications
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : affiliates.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No pending applications.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{affiliates.map((aff) => (
						<div
							key={aff.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<p className="font-medium text-foreground text-sm">
										{aff.name}
									</p>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{aff.email}</span>
										{aff.website ? <span>{aff.website}</span> : null}
										<span>Applied: {formatDate(aff.createdAt)}</span>
									</div>
									{aff.notes ? (
										<p className="mt-2 text-foreground text-sm">{aff.notes}</p>
									) : null}
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => handleApprove(aff.id)}
										className="rounded bg-green-50 px-3 py-1.5 font-medium text-green-700 text-xs hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
									>
										Approve
									</button>
									<button
										type="button"
										onClick={() => handleReject(aff.id)}
										className="rounded px-3 py-1.5 font-medium text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										Reject
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// ConversionList — affiliate conversions
// ---------------------------------------------------------------------------

export function ConversionList() {
	const api = useAffiliatesApi();
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.listConversions.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { conversions?: Conversion[]; total?: number } | undefined;
		isLoading: boolean;
	};

	const approveMutation = api.approveConversion.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const rejectMutation = api.rejectConversion.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const conversions = data?.conversions ?? [];

	const handleApprove = async (id: string) => {
		try {
			await approveMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleReject = async (id: string) => {
		try {
			await rejectMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">Conversions</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Track and approve affiliate conversions
				</p>
			</div>

			{/* Filter */}
			<div className="mb-4">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="pending">Pending</option>
					<option value="approved">Approved</option>
					<option value="rejected">Rejected</option>
				</select>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-14 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : conversions.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No conversions found.</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-border border-b bg-muted">
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Affiliate
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Amount
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Commission
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Status
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Date
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{conversions.map((conv) => (
								<tr
									key={conv.id}
									className="transition-colors hover:bg-muted/50"
								>
									<td className="px-4 py-2 font-mono text-foreground text-xs">
										{conv.affiliateId.slice(0, 8)}...
									</td>
									<td className="px-4 py-2 text-foreground">
										{formatCurrency(conv.amount)}
									</td>
									<td className="px-4 py-2 text-foreground">
										{formatCurrency(conv.commission)}
									</td>
									<td className="px-4 py-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${CONVERSION_STATUS_COLORS[conv.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{conv.status}
										</span>
									</td>
									<td className="px-4 py-2 text-muted-foreground text-xs">
										{formatDate(conv.createdAt)}
									</td>
									<td className="px-4 py-2">
										{conv.status === "pending" ? (
											<div className="flex gap-1">
												<button
													type="button"
													onClick={() => handleApprove(conv.id)}
													className="rounded px-2 py-1 text-green-700 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
												>
													Approve
												</button>
												<button
													type="button"
													onClick={() => handleReject(conv.id)}
													className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
												>
													Reject
												</button>
											</div>
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// PayoutList — affiliate payouts + create
// ---------------------------------------------------------------------------

export function PayoutList() {
	const api = useAffiliatesApi();
	const [statusFilter, setStatusFilter] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [payoutAffiliateId, setPayoutAffiliateId] = useState("");
	const [payoutAmount, setPayoutAmount] = useState(0);
	const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
	const [payoutNotes, setPayoutNotes] = useState("");
	const [error, setError] = useState("");

	const { data, isLoading } = api.listPayouts.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { payouts?: Payout[]; total?: number } | undefined;
		isLoading: boolean;
	};

	const createMutation = api.createPayout.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const completeMutation = api.completePayout.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const failMutation = api.failPayout.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const payouts = data?.payouts ?? [];

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!payoutAffiliateId.trim() || payoutAmount <= 0) {
			setError("Affiliate ID and a positive amount are required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					affiliateId: payoutAffiliateId.trim(),
					amount: payoutAmount,
					method: payoutMethod,
					notes: payoutNotes.trim() || undefined,
				},
			});
			setPayoutAffiliateId("");
			setPayoutAmount(0);
			setPayoutMethod("bank_transfer");
			setPayoutNotes("");
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleComplete = async (id: string) => {
		try {
			await completeMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleFail = async (id: string) => {
		try {
			await failMutation.mutateAsync({
				params: { id },
				body: { id },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Payouts</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage affiliate payouts
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Create Payout"}
				</button>
			</div>

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Payout
					</h2>
					{error ? (
						<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					) : null}
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Affiliate ID
								</span>
								<input
									type="text"
									value={payoutAffiliateId}
									onChange={(e) => setPayoutAffiliateId(e.target.value)}
									placeholder="Affiliate ID"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Amount (cents)
								</span>
								<input
									type="number"
									value={payoutAmount}
									onChange={(e) =>
										setPayoutAmount(Number.parseInt(e.target.value, 10) || 0)
									}
									min={1}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Method</span>
								<select
									value={payoutMethod}
									onChange={(e) => setPayoutMethod(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								>
									<option value="bank_transfer">Bank Transfer</option>
									<option value="paypal">PayPal</option>
									<option value="store_credit">Store Credit</option>
									<option value="check">Check</option>
								</select>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Notes</span>
								<input
									type="text"
									value={payoutNotes}
									onChange={(e) => setPayoutNotes(e.target.value)}
									placeholder="Optional notes"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Payout"}
						</button>
					</form>
				</div>
			) : null}

			{/* Filter */}
			<div className="mb-4">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="pending">Pending</option>
					<option value="processing">Processing</option>
					<option value="completed">Completed</option>
					<option value="failed">Failed</option>
				</select>
			</div>

			{/* Payout list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-14 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : payouts.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No payouts found.</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-border border-b bg-muted">
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Affiliate
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Amount
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Method
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Status
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Date
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{payouts.map((p) => (
								<tr key={p.id} className="transition-colors hover:bg-muted/50">
									<td className="px-4 py-2 font-mono text-foreground text-xs">
										{p.affiliateId.slice(0, 8)}...
									</td>
									<td className="px-4 py-2 text-foreground">
										{formatCurrency(p.amount)}
									</td>
									<td className="px-4 py-2 text-foreground text-xs">
										{p.method}
									</td>
									<td className="px-4 py-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${PAYOUT_STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{p.status}
										</span>
									</td>
									<td className="px-4 py-2 text-muted-foreground text-xs">
										{formatDate(p.createdAt)}
									</td>
									<td className="px-4 py-2">
										{p.status === "pending" || p.status === "processing" ? (
											<div className="flex gap-1">
												<button
													type="button"
													onClick={() => handleComplete(p.id)}
													className="rounded px-2 py-1 text-green-700 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
												>
													Complete
												</button>
												<button
													type="button"
													onClick={() => handleFail(p.id)}
													className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
												>
													Fail
												</button>
											</div>
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
