"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Vendor {
	id: string;
	name: string;
	slug: string;
	email: string;
	phone?: string;
	description?: string;
	logo?: string;
	banner?: string;
	website?: string;
	commissionRate: number;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface VendorStats {
	totalVendors: number;
	activeVendors: number;
	pendingVendors: number;
	suspendedVendors: number;
}

interface PayoutStats {
	totalPaid: number;
	totalPending: number;
	totalProcessing: number;
	payoutCount: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useVendorsApi() {
	const client = useModuleClient();
	return {
		listVendors: client.module("vendors").admin["/admin/vendors"],
		stats: client.module("vendors").admin["/admin/vendors/stats"],
		getVendor: client.module("vendors").admin["/admin/vendors/:id"],
		createVendor: client.module("vendors").admin["/admin/vendors/create"],
		updateVendor: client.module("vendors").admin["/admin/vendors/:id/update"],
		updateStatus: client.module("vendors").admin["/admin/vendors/:id/status"],
		deleteVendor: client.module("vendors").admin["/admin/vendors/:id/delete"],
		listProducts:
			client.module("vendors").admin["/admin/vendors/:vendorId/products"],
		assignProduct:
			client.module("vendors").admin[
				"/admin/vendors/:vendorId/products/assign"
			],
		vendorPayouts:
			client.module("vendors").admin["/admin/vendors/:vendorId/payouts"],
		createPayout:
			client.module("vendors").admin["/admin/vendors/:vendorId/payouts/create"],
		updatePayoutStatus:
			client.module("vendors").admin["/admin/vendors/payouts/:id/status"],
		payoutStats: client.module("vendors").admin["/admin/vendors/payouts/stats"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatCurrency(amount: number, currency = "USD") {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
	}).format(amount / 100);
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

// ---------------------------------------------------------------------------
// VendorAdmin — main vendor list + create
// ---------------------------------------------------------------------------

export function VendorAdmin() {
	const api = useVendorsApi();
	const [statusFilter, setStatusFilter] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [email, setEmail] = useState("");
	const [commissionRate, setCommissionRate] = useState(10);
	const [error, setError] = useState("");

	const { data, isLoading } = api.listVendors.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { vendors?: Vendor[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: VendorStats } | undefined;
	};

	const vendors = data?.vendors ?? [];
	const stats = statsData?.stats;

	const createMutation = api.createVendor.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!name.trim() || !email.trim()) {
			setError("Name and email are required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					name: name.trim(),
					slug:
						slug.trim() ||
						name
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, "-")
							.replace(/^-|-$/g, ""),
					email: email.trim(),
					commissionRate,
				},
			});
			setName("");
			setSlug("");
			setEmail("");
			setCommissionRate(10);
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Vendors</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage marketplace vendors
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Add Vendor"}
				</button>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalVendors}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Active
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.activeVendors}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{stats.pendingVendors}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Suspended
						</p>
						<p className="mt-1 font-bold text-2xl text-red-600">
							{stats.suspendedVendors}
						</p>
					</div>
				</div>
			) : null}

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Vendor
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
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Vendor name"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									placeholder="vendor-slug"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Email</span>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="vendor@example.com"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Commission Rate (%)
								</span>
								<input
									type="number"
									value={commissionRate}
									onChange={(e) =>
										setCommissionRate(Number.parseFloat(e.target.value) || 0)
									}
									min={0}
									max={100}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Vendor"}
						</button>
					</form>
				</div>
			) : null}

			{/* Filters */}
			<div className="mb-4">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="pending">Pending</option>
					<option value="active">Active</option>
					<option value="suspended">Suspended</option>
					<option value="closed">Closed</option>
				</select>
			</div>

			{/* Vendor list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : vendors.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No vendors found.</p>
				</div>
			) : (
				<div className="space-y-3">
					{vendors.map((vendor) => (
						<div
							key={vendor.id}
							className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{vendor.name}
										</p>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[vendor.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{vendor.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{vendor.email}</span>
										<span>Commission: {vendor.commissionRate}%</span>
										{vendor.website ? <span>{vendor.website}</span> : null}
									</div>
								</div>
								<span className="whitespace-nowrap text-muted-foreground text-xs">
									{formatDate(vendor.createdAt)}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// VendorPayouts — payout management
// ---------------------------------------------------------------------------

export function VendorPayouts() {
	const api = useVendorsApi();

	const { data: statsData } = api.payoutStats.useQuery({}) as {
		data: { stats?: PayoutStats } | undefined;
	};

	const stats = statsData?.stats;

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">Vendor Payouts</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Track and manage vendor payouts
				</p>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Paid
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{formatCurrency(stats.totalPaid)}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{formatCurrency(stats.totalPending)}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Processing
						</p>
						<p className="mt-1 font-bold text-2xl text-blue-600">
							{formatCurrency(stats.totalProcessing)}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Payouts
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.payoutCount}
						</p>
					</div>
				</div>
			) : null}

			<p className="text-muted-foreground text-sm">
				To manage payouts for a specific vendor, go to the{" "}
				<a href="/admin/vendors" className="underline hover:text-foreground">
					Vendors
				</a>{" "}
				page and select a vendor.
			</p>
		</div>
	);
}
