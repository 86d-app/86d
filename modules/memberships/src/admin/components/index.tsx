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
// PlanSheet — create / edit a membership plan
// ---------------------------------------------------------------------------

const inputCls =
	"w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";
const labelCls = "mb-1 block font-medium text-foreground text-sm";

interface PlanSheetProps {
	plan?: MembershipPlan;
	onSaved: () => void;
	onCancel: () => void;
}

function PlanSheet({ plan, onSaved, onCancel }: PlanSheetProps) {
	const api = useMembershipsApi();
	const isEditing = !!plan;

	const [name, setName] = useState(plan?.name ?? "");
	const [slug, setSlug] = useState(plan?.slug ?? "");
	const [description, setDescription] = useState(plan?.description ?? "");
	const [price, setPrice] = useState(
		plan ? String((plan.price / 100).toFixed(2)) : "",
	);
	const [billingInterval, setBillingInterval] = useState(
		plan?.billingInterval ?? "monthly",
	);
	const [trialDays, setTrialDays] = useState(String(plan?.trialDays ?? 0));
	const [maxMembers, setMaxMembers] = useState(
		plan?.maxMembers ? String(plan.maxMembers) : "",
	);
	const [features, setFeatures] = useState(
		plan?.features ? plan.features.join(", ") : "",
	);
	const [isActive, setIsActive] = useState(plan?.isActive ?? true);
	const [error, setError] = useState("");

	const createMutation = api.createPlan.useMutation({
		onSuccess: () => {
			void api.listPlans.invalidate();
			onSaved();
		},
		onError: (err: Error) => setError(extractError(err)),
	});

	const updateMutation = api.updatePlan.useMutation({
		onSuccess: () => {
			void api.listPlans.invalidate();
			onSaved();
		},
		onError: (err: Error) => setError(extractError(err)),
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!name.trim()) {
			setError("Plan name is required.");
			return;
		}

		const parsedPrice = Math.round(Number.parseFloat(price) * 100);
		if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
			setError("Enter a valid price.");
			return;
		}

		const parsedTrialDays = Number.parseInt(trialDays, 10) || 0;
		const parsedMaxMembers = maxMembers.trim()
			? Number.parseInt(maxMembers, 10)
			: undefined;
		const parsedFeatures = features.trim()
			? features
					.split(",")
					.map((f) => f.trim())
					.filter(Boolean)
			: undefined;

		const autoSlug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");

		if (isEditing) {
			updateMutation.mutate({
				params: { id: plan.id },
				body: {
					name: name.trim(),
					slug: slug.trim() || autoSlug,
					description: description.trim() || null,
					price: parsedPrice,
					billingInterval: billingInterval as "monthly" | "yearly" | "lifetime",
					trialDays: parsedTrialDays,
					isActive,
					...(parsedMaxMembers != null ? { maxMembers: parsedMaxMembers } : {}),
					...(parsedFeatures != null ? { features: parsedFeatures } : {}),
				},
			});
		} else {
			createMutation.mutate({
				body: {
					name: name.trim(),
					slug: slug.trim() || autoSlug,
					description: description.trim() || undefined,
					price: parsedPrice,
					billingInterval: billingInterval as "monthly" | "yearly" | "lifetime",
					trialDays: parsedTrialDays,
					...(parsedMaxMembers != null ? { maxMembers: parsedMaxMembers } : {}),
					...(parsedFeatures != null ? { features: parsedFeatures } : {}),
				},
			});
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<button
				type="button"
				className="absolute inset-0 cursor-default bg-black/40"
				aria-label="Close panel"
				onClick={onCancel}
			/>
			<div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-border border-l bg-background shadow-2xl">
				{/* Header */}
				<div className="flex shrink-0 items-center justify-between border-border border-b px-6 py-4">
					<h2 className="font-semibold text-foreground text-lg">
						{isEditing ? "Edit Plan" : "New Plan"}
					</h2>
					<button
						type="button"
						onClick={onCancel}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						✕
					</button>
				</div>

				{/* Body */}
				<form
					onSubmit={handleSubmit}
					className="flex flex-1 flex-col gap-5 px-6 py-6"
				>
					{error ? (
						<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
							{error}
						</div>
					) : null}

					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label htmlFor="ps-name" className={labelCls}>
									Name <span className="text-destructive">*</span>
								</label>
								<input
									id="ps-name"
									className={inputCls}
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Premium"
								/>
							</div>
							<div>
								<label htmlFor="ps-slug" className={labelCls}>
									Slug
								</label>
								<input
									id="ps-slug"
									className={inputCls}
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									placeholder="premium"
								/>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							<div>
								<label htmlFor="ps-price" className={labelCls}>
									Price ($) <span className="text-destructive">*</span>
								</label>
								<input
									id="ps-price"
									type="number"
									step="0.01"
									min="0"
									className={inputCls}
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									placeholder="9.99"
								/>
							</div>
							<div>
								<label htmlFor="ps-interval" className={labelCls}>
									Billing
								</label>
								<select
									id="ps-interval"
									className={inputCls}
									value={billingInterval}
									onChange={(e) => setBillingInterval(e.target.value)}
								>
									<option value="monthly">Monthly</option>
									<option value="yearly">Yearly</option>
									<option value="lifetime">Lifetime</option>
								</select>
							</div>
							<div>
								<label htmlFor="ps-trial" className={labelCls}>
									Trial days
								</label>
								<input
									id="ps-trial"
									type="number"
									min="0"
									className={inputCls}
									value={trialDays}
									onChange={(e) => setTrialDays(e.target.value)}
									placeholder="0"
								/>
							</div>
						</div>

						<div>
							<label htmlFor="ps-description" className={labelCls}>
								Description
							</label>
							<input
								id="ps-description"
								className={inputCls}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What's included in this plan"
							/>
						</div>

						<div>
							<label htmlFor="ps-features" className={labelCls}>
								Features{" "}
								<span className="font-normal text-muted-foreground">
									(comma-separated)
								</span>
							</label>
							<input
								id="ps-features"
								className={inputCls}
								value={features}
								onChange={(e) => setFeatures(e.target.value)}
								placeholder="Unlimited orders, Priority support"
							/>
						</div>

						<div>
							<label htmlFor="ps-maxmembers" className={labelCls}>
								Max members{" "}
								<span className="font-normal text-muted-foreground">
									(leave blank for unlimited)
								</span>
							</label>
							<input
								id="ps-maxmembers"
								type="number"
								min="1"
								className={inputCls}
								value={maxMembers}
								onChange={(e) => setMaxMembers(e.target.value)}
								placeholder="Unlimited"
							/>
						</div>

						{isEditing ? (
							<label className="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									checked={isActive}
									onChange={(e) => setIsActive(e.target.checked)}
									className="h-4 w-4 rounded border-border accent-foreground"
								/>
								<span className="text-foreground text-sm">Active</span>
							</label>
						) : null}
					</div>

					{/* Footer */}
					<div className="mt-auto flex justify-end gap-2 border-border border-t pt-4">
						<button
							type="button"
							onClick={onCancel}
							className="rounded-lg border border-border px-4 py-2 text-foreground text-sm hover:bg-muted"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{isPending
								? isEditing
									? "Saving..."
									: "Creating..."
								: isEditing
									? "Save Changes"
									: "Create Plan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// MembershipPlans — plan list with create + edit + delete
// ---------------------------------------------------------------------------

export function MembershipPlans() {
	const api = useMembershipsApi();
	const [showCreate, setShowCreate] = useState(false);
	const [editPlan, setEditPlan] = useState<MembershipPlan | null>(null);

	const { data, isLoading } = api.listPlans.useQuery({}) as {
		data: { plans?: MembershipPlan[]; total?: number } | undefined;
		isLoading: boolean;
	};

	const deleteMutation = api.deletePlan.useMutation({
		onSuccess: () => void api.listPlans.invalidate(),
	}) as {
		mutate: (opts: { params: { id: string } }) => void;
		isPending: boolean;
	};

	const plans = data?.plans ?? [];

	const handleDelete = (plan: MembershipPlan) => {
		if (
			!confirm(
				`Delete plan "${plan.name}"? Active subscribers will not be affected, but new signups will be disabled.`,
			)
		)
			return;
		deleteMutation.mutate({ params: { id: plan.id } });
	};

	return (
		<div>
			{/* Sheet overlays */}
			{showCreate ? (
				<PlanSheet
					onSaved={() => setShowCreate(false)}
					onCancel={() => setShowCreate(false)}
				/>
			) : null}
			{editPlan ? (
				<PlanSheet
					plan={editPlan}
					onSaved={() => setEditPlan(null)}
					onCancel={() => setEditPlan(null)}
				/>
			) : null}

			{/* Header */}
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
					onClick={() => setShowCreate(true)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					Create Plan
				</button>
			</div>

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
				<div className="rounded-lg border border-border bg-card p-10 text-center">
					<p className="font-medium text-foreground text-sm">No plans yet</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Create a plan to start accepting memberships
					</p>
					<button
						type="button"
						onClick={() => setShowCreate(true)}
						className="mt-4 rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
					>
						Create Plan
					</button>
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
										onClick={() => setEditPlan(plan)}
										className="rounded px-2 py-1 text-xs hover:bg-muted"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleDelete(plan)}
										disabled={deleteMutation.isPending}
										className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
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
