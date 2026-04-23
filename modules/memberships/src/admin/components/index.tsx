"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Membership {
	id: string;
	customerId: string;
	planId: string;
	status: string;
	startDate: string;
	endDate?: string;
	trialEndDate?: string;
	cancelledAt?: string;
	pausedAt?: string;
	createdAt: string;
	updatedAt: string;
}

interface MembershipPlan {
	id: string;
	name: string;
	slug: string;
	description?: string;
	price: number;
	billingInterval: string;
	trialDays: number;
	features?: string[];
	isActive: boolean;
	maxMembers?: number;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface MembershipStats {
	totalMemberships: number;
	activeMemberships: number;
	trialMemberships: number;
	cancelledMemberships: number;
	pausedMemberships: number;
}

const MEMBERSHIP_SKELETON_IDS = ["a", "b", "c", "d"] as const;
const PLAN_SKELETON_IDS = ["a", "b", "c"] as const;

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useMembershipsApi() {
	const client = useModuleClient();
	return {
		listMemberships: client.module("memberships").admin["/admin/memberships"],
		getMembership: client.module("memberships").admin["/admin/memberships/:id"],
		cancelMembership:
			client.module("memberships").admin["/admin/memberships/:id/cancel"],
		pauseMembership:
			client.module("memberships").admin["/admin/memberships/:id/pause"],
		resumeMembership:
			client.module("memberships").admin["/admin/memberships/:id/resume"],
		stats: client.module("memberships").admin["/admin/memberships/stats"],
		listPlans: client.module("memberships").admin["/admin/memberships/plans"],
		createPlan:
			client.module("memberships").admin["/admin/memberships/plans/create"],
		updatePlan:
			client.module("memberships").admin["/admin/memberships/plans/:id/update"],
		deletePlan:
			client.module("memberships").admin["/admin/memberships/plans/:id/delete"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	trial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	expired: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	paused:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const INTERVAL_LABELS: Record<string, string> = {
	monthly: "Monthly",
	yearly: "Yearly",
	lifetime: "Lifetime",
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
// MembershipAdmin — membership list + actions
// ---------------------------------------------------------------------------

export function MembershipAdmin() {
	const api = useMembershipsApi();
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.listMemberships.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { memberships?: Membership[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: MembershipStats } | undefined;
	};

	const cancelMutation = api.cancelMembership.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const pauseMutation = api.pauseMembership.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const resumeMutation = api.resumeMembership.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const memberships = data?.memberships ?? [];
	const stats = statsData?.stats;

	const handleAction = async (
		id: string,
		action: "cancel" | "pause" | "resume",
	) => {
		const mutation =
			action === "cancel"
				? cancelMutation
				: action === "pause"
					? pauseMutation
					: resumeMutation;
		try {
			await mutation.mutateAsync({ params: { id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">Memberships</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage customer memberships
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
							{stats.totalMemberships}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Active
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.activeMemberships}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Trial
						</p>
						<p className="mt-1 font-bold text-2xl text-blue-600">
							{stats.trialMemberships}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Paused
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{stats.pausedMemberships}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Cancelled
						</p>
						<p className="mt-1 font-bold text-2xl text-red-600">
							{stats.cancelledMemberships}
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
					<option value="active">Active</option>
					<option value="trial">Trial</option>
					<option value="expired">Expired</option>
					<option value="cancelled">Cancelled</option>
					<option value="paused">Paused</option>
				</select>
			</div>

			{/* Membership list */}
			{isLoading ? (
				<div className="space-y-3">
					{MEMBERSHIP_SKELETON_IDS.map((id) => (
						<div
							key={`membership-skel-${id}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : memberships.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No memberships found.</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-border border-b bg-muted">
								<th className="px-4 py-2 font-medium text-muted-foreground">
									ID
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Customer
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Plan
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Status
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Started
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{memberships.map((m) => (
								<tr key={m.id} className="transition-colors hover:bg-muted/50">
									<td className="px-4 py-2 font-mono text-xs">
										{m.id.slice(0, 8)}...
									</td>
									<td className="px-4 py-2 text-foreground">
										{m.customerId.slice(0, 8)}...
									</td>
									<td className="px-4 py-2 text-foreground">
										{m.planId.slice(0, 8)}...
									</td>
									<td className="px-4 py-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[m.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{m.status}
										</span>
									</td>
									<td className="px-4 py-2 text-muted-foreground text-xs">
										{formatDate(m.startDate)}
									</td>
									<td className="px-4 py-2">
										<div className="flex gap-1">
											{m.status === "active" || m.status === "trial" ? (
												<>
													<button
														type="button"
														onClick={() => handleAction(m.id, "pause")}
														className="rounded px-2 py-1 text-xs hover:bg-muted"
													>
														Pause
													</button>
													<button
														type="button"
														onClick={() => handleAction(m.id, "cancel")}
														className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
													>
														Cancel
													</button>
												</>
											) : null}
											{m.status === "paused" ? (
												<button
													type="button"
													onClick={() => handleAction(m.id, "resume")}
													className="rounded px-2 py-1 text-xs hover:bg-muted"
												>
													Resume
												</button>
											) : null}
										</div>
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
// MembershipPlans — plan list + create
// ---------------------------------------------------------------------------

export function MembershipPlans() {
	const api = useMembershipsApi();
	const [showCreate, setShowCreate] = useState(false);
	const [planName, setPlanName] = useState("");
	const [planSlug, setPlanSlug] = useState("");
	const [planPrice, setPlanPrice] = useState(0);
	const [planInterval, setPlanInterval] = useState("monthly");
	const [planTrialDays, setPlanTrialDays] = useState(0);
	const [planDescription, setPlanDescription] = useState("");
	const [error, setError] = useState("");

	const { data, isLoading } = api.listPlans.useQuery({}) as {
		data: { plans?: MembershipPlan[]; total?: number } | undefined;
		isLoading: boolean;
	};

	const createMutation = api.createPlan.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.deletePlan.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const plans = data?.plans ?? [];

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!planName.trim()) {
			setError("Plan name is required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					name: planName.trim(),
					slug:
						planSlug.trim() ||
						planName
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, "-")
							.replace(/^-|-$/g, ""),
					price: planPrice,
					billingInterval: planInterval,
					trialDays: planTrialDays,
					description: planDescription.trim() || undefined,
				},
			});
			setPlanName("");
			setPlanSlug("");
			setPlanPrice(0);
			setPlanInterval("monthly");
			setPlanTrialDays(0);
			setPlanDescription("");
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this plan? This cannot be undone.")) return;
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">
						Membership Plans
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Create and manage subscription plans
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Create Plan"}
				</button>
			</div>

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Plan
					</h2>
					{error ? (
						<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					) : null}
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Name</span>
								<input
									type="text"
									value={planName}
									onChange={(e) => setPlanName(e.target.value)}
									placeholder="Premium"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={planSlug}
									onChange={(e) => setPlanSlug(e.target.value)}
									placeholder="premium"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Price (cents)
								</span>
								<input
									type="number"
									value={planPrice}
									onChange={(e) =>
										setPlanPrice(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Billing Interval
								</span>
								<select
									value={planInterval}
									onChange={(e) => setPlanInterval(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								>
									<option value="monthly">Monthly</option>
									<option value="yearly">Yearly</option>
									<option value="lifetime">Lifetime</option>
								</select>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Trial Days
								</span>
								<input
									type="number"
									value={planTrialDays}
									onChange={(e) =>
										setPlanTrialDays(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Description
							</span>
							<input
								type="text"
								value={planDescription}
								onChange={(e) => setPlanDescription(e.target.value)}
								placeholder="Optional plan description"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Plan"}
						</button>
					</form>
				</div>
			) : null}

			{/* Plan list */}
			{isLoading ? (
				<div className="space-y-3">
					{PLAN_SKELETON_IDS.map((id) => (
						<div
							key={`plan-skel-${id}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : plans.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No plans yet. Create one to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{plans.map((plan) => (
						<div
							key={plan.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{plan.name}
										</p>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												plan.isActive
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{plan.isActive ? "Active" : "Inactive"}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{formatCurrency(plan.price)}</span>
										<span>
											{INTERVAL_LABELS[plan.billingInterval] ??
												plan.billingInterval}
										</span>
										{plan.trialDays > 0 ? (
											<span>{plan.trialDays}-day trial</span>
										) : null}
										{plan.maxMembers ? (
											<span>Max {plan.maxMembers} members</span>
										) : null}
										{plan.description ? <span>{plan.description}</span> : null}
									</div>
									{plan.features && plan.features.length > 0 ? (
										<div className="mt-2 flex flex-wrap gap-1">
											{plan.features.map((f) => (
												<span
													key={f}
													className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
												>
													{f}
												</span>
											))}
										</div>
									) : null}
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => handleDelete(plan.id)}
										className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										Delete
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
