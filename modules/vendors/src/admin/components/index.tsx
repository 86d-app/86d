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

interface Payout {
	id: string;
	vendorId: string;
	amount: number;
	currency: string;
	status: string;
	method?: string;
	reference?: string;
	periodStart: string;
	periodEnd: string;
	notes?: string;
	createdAt: string;
}

interface PayoutStats {
	totalPaid: number;
	totalPending: number;
	totalProcessing: number;
	payoutCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
	"w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";
const labelCls = "mb-1 block font-medium text-foreground text-sm";

const VENDOR_STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
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

const SKELETON_IDS = ["a", "b", "c", "d"] as const;
const PAYOUT_SKELETON_IDS = ["a", "b", "c"] as const;

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
// API hook
// ---------------------------------------------------------------------------

function useVendorsApi() {
	const client = useModuleClient();
	return {
		listVendors: client.module("vendors").admin["/admin/vendors"],
		stats: client.module("vendors").admin["/admin/vendors/stats"],
		createVendor: client.module("vendors").admin["/admin/vendors/create"],
		updateVendor: client.module("vendors").admin["/admin/vendors/:id/update"],
		updateStatus: client.module("vendors").admin["/admin/vendors/:id/status"],
		deleteVendor: client.module("vendors").admin["/admin/vendors/:id/delete"],
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
// VendorSheet — create / edit vendor
// ---------------------------------------------------------------------------

interface VendorSheetProps {
	vendor?: Vendor;
	onSaved: () => void;
	onCancel: () => void;
}

function VendorSheet({ vendor, onSaved, onCancel }: VendorSheetProps) {
	const api = useVendorsApi();
	const isEditing = !!vendor;

	const [name, setName] = useState(vendor?.name ?? "");
	const [slug, setSlug] = useState(vendor?.slug ?? "");
	const [email, setEmail] = useState(vendor?.email ?? "");
	const [phone, setPhone] = useState(vendor?.phone ?? "");
	const [description, setDescription] = useState(vendor?.description ?? "");
	const [website, setWebsite] = useState(vendor?.website ?? "");
	const [commissionRate, setCommissionRate] = useState(
		String(vendor?.commissionRate ?? 10),
	);
	const [error, setError] = useState("");

	const createMutation = api.createVendor.useMutation({
		onSuccess: () => {
			void api.listVendors.invalidate();
			void api.stats.invalidate();
			onSaved();
		},
		onError: (err: Error) => setError(extractError(err)),
	});

	const updateMutation = api.updateVendor.useMutation({
		onSuccess: () => {
			void api.listVendors.invalidate();
			onSaved();
		},
		onError: (err: Error) => setError(extractError(err)),
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		if (!name.trim() || !email.trim()) {
			setError("Name and email are required.");
			return;
		}

		const autoSlug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");

		const body = {
			name: name.trim(),
			slug: slug.trim() || autoSlug,
			email: email.trim(),
			...(phone.trim() ? { phone: phone.trim() } : { phone: null }),
			...(description.trim()
				? { description: description.trim() }
				: { description: null }),
			...(website.trim() ? { website: website.trim() } : { website: null }),
			commissionRate: Number.parseFloat(commissionRate) || 0,
		};

		if (isEditing) {
			updateMutation.mutate({ params: { id: vendor.id }, body });
		} else {
			createMutation.mutate({ body });
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
				<div className="flex shrink-0 items-center justify-between border-border border-b px-6 py-4">
					<h2 className="font-semibold text-foreground text-lg">
						{isEditing ? "Edit Vendor" : "New Vendor"}
					</h2>
					<button
						type="button"
						onClick={onCancel}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						✕
					</button>
				</div>

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
								<label htmlFor="vs-name" className={labelCls}>
									Name <span className="text-destructive">*</span>
								</label>
								<input
									id="vs-name"
									className={inputCls}
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Acme Supplies"
								/>
							</div>
							<div>
								<label htmlFor="vs-slug" className={labelCls}>
									Slug
								</label>
								<input
									id="vs-slug"
									className={inputCls}
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									placeholder="acme-supplies"
								/>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label htmlFor="vs-email" className={labelCls}>
									Email <span className="text-destructive">*</span>
								</label>
								<input
									id="vs-email"
									type="email"
									className={inputCls}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="vendor@example.com"
								/>
							</div>
							<div>
								<label htmlFor="vs-phone" className={labelCls}>
									Phone
								</label>
								<input
									id="vs-phone"
									type="tel"
									className={inputCls}
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="(555) 000-0000"
								/>
							</div>
						</div>

						<div>
							<label htmlFor="vs-website" className={labelCls}>
								Website
							</label>
							<input
								id="vs-website"
								type="url"
								className={inputCls}
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
								placeholder="https://vendor.com"
							/>
						</div>

						<div>
							<label htmlFor="vs-description" className={labelCls}>
								Description
							</label>
							<textarea
								id="vs-description"
								rows={3}
								className={inputCls}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Brief description of the vendor"
							/>
						</div>

						<div>
							<label htmlFor="vs-commission" className={labelCls}>
								Commission rate (%)
							</label>
							<input
								id="vs-commission"
								type="number"
								min="0"
								max="100"
								step="0.1"
								className={inputCls}
								value={commissionRate}
								onChange={(e) => setCommissionRate(e.target.value)}
							/>
						</div>
					</div>

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
									: "Create Vendor"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// VendorAdmin — main vendor list + create + edit + delete + status
// ---------------------------------------------------------------------------

export function VendorAdmin() {
	const api = useVendorsApi();
	const [statusFilter, setStatusFilter] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [editVendor, setEditVendor] = useState<Vendor | null>(null);

	const { data, isLoading } = api.listVendors.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { vendors?: Vendor[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: VendorStats } | undefined;
	};

	const deleteVendorMutation = api.deleteVendor.useMutation({
		onSuccess: () => {
			void api.listVendors.invalidate();
			void api.stats.invalidate();
		},
	});

	const updateStatusMutation = api.updateStatus.useMutation({
		onSuccess: () => {
			void api.listVendors.invalidate();
			void api.stats.invalidate();
		},
	});

	const vendors = data?.vendors ?? [];
	const stats = statsData?.stats;

	const handleDelete = (vendor: Vendor) => {
		if (
			!window.confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)
		)
			return;
		deleteVendorMutation.mutate({ params: { id: vendor.id } });
	};

	const handleStatusChange = (vendor: Vendor, newStatus: string) => {
		updateStatusMutation.mutate({
			params: { id: vendor.id },
			body: {
				status: newStatus as "pending" | "active" | "suspended" | "closed",
			},
		});
	};

	return (
		<div>
			{/* Sheet overlays */}
			{showCreate ? (
				<VendorSheet
					onSaved={() => setShowCreate(false)}
					onCancel={() => setShowCreate(false)}
				/>
			) : null}
			{editVendor ? (
				<VendorSheet
					vendor={editVendor}
					onSaved={() => setEditVendor(null)}
					onCancel={() => setEditVendor(null)}
				/>
			) : null}

			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Vendors</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage marketplace vendors
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(true)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					Add Vendor
				</button>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{[
						{
							label: "Total",
							value: stats.totalVendors,
							cls: "text-foreground",
						},
						{
							label: "Active",
							value: stats.activeVendors,
							cls: "text-green-600",
						},
						{
							label: "Pending",
							value: stats.pendingVendors,
							cls: "text-yellow-600",
						},
						{
							label: "Suspended",
							value: stats.suspendedVendors,
							cls: "text-red-600",
						},
					].map(({ label, value, cls }) => (
						<div
							key={label}
							className="rounded-lg border border-border bg-card p-4"
						>
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								{label}
							</p>
							<p className={`mt-1 font-bold text-2xl ${cls}`}>{value}</p>
						</div>
					))}
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
					<option value="active">Active</option>
					<option value="suspended">Suspended</option>
					<option value="closed">Closed</option>
				</select>
			</div>

			{/* Vendor list */}
			{isLoading ? (
				<div className="space-y-3">
					{SKELETON_IDS.map((id) => (
						<div
							key={`vend-skel-${id}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : vendors.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-10 text-center">
					<p className="font-medium text-foreground text-sm">No vendors yet</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Add a vendor to your marketplace
					</p>
					<button
						type="button"
						onClick={() => setShowCreate(true)}
						className="mt-4 rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
					>
						Add Vendor
					</button>
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
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${VENDOR_STATUS_COLORS[vendor.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{vendor.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{vendor.email}</span>
										<span>Commission: {vendor.commissionRate}%</span>
										{vendor.website ? <span>{vendor.website}</span> : null}
									</div>
									{vendor.description ? (
										<p className="mt-1.5 text-muted-foreground text-xs">
											{vendor.description}
										</p>
									) : null}
								</div>
								<div className="flex shrink-0 items-center gap-1">
									{/* Status change dropdown */}
									<select
										value={vendor.status}
										onChange={(e) => handleStatusChange(vendor, e.target.value)}
										disabled={updateStatusMutation.isPending}
										className="rounded border border-border bg-background px-2 py-1 text-xs"
										aria-label="Change status"
									>
										<option value="pending">Pending</option>
										<option value="active">Active</option>
										<option value="suspended">Suspended</option>
										<option value="closed">Closed</option>
									</select>
									<button
										type="button"
										onClick={() => setEditVendor(vendor)}
										className="rounded px-2 py-1 text-xs hover:bg-muted"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => handleDelete(vendor)}
										disabled={deleteVendorMutation.isPending}
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

// ---------------------------------------------------------------------------
// VendorPayouts — per-vendor payout management
// ---------------------------------------------------------------------------

export function VendorPayouts() {
	const api = useVendorsApi();
	const [selectedVendorId, setSelectedVendorId] = useState("");
	const [showCreatePayout, setShowCreatePayout] = useState(false);
	const [payoutAmount, setPayoutAmount] = useState("");
	const [payoutCurrency, setPayoutCurrency] = useState("USD");
	const [payoutMethod, setPayoutMethod] = useState("");
	const [payoutReference, setPayoutReference] = useState("");
	const [payoutPeriodStart, setPayoutPeriodStart] = useState("");
	const [payoutPeriodEnd, setPayoutPeriodEnd] = useState("");
	const [payoutNotes, setPayoutNotes] = useState("");
	const [payoutError, setPayoutError] = useState("");

	const { data: statsData } = api.payoutStats.useQuery({}) as {
		data: { stats?: PayoutStats } | undefined;
	};

	const { data: vendorsData } = api.listVendors.useQuery({}) as {
		data: { vendors?: Vendor[] } | undefined;
	};

	const { data: payoutsData, isLoading: loadingPayouts } =
		api.vendorPayouts.useQuery(
			selectedVendorId
				? { vendorId: selectedVendorId }
				: { vendorId: "__skip__" },
			{ enabled: !!selectedVendorId },
		) as {
			data: { payouts?: Payout[]; total?: number } | undefined;
			isLoading: boolean;
		};

	const createPayoutMutation = api.createPayout.useMutation({
		onSuccess: () => {
			void api.vendorPayouts.invalidate();
			void api.payoutStats.invalidate();
			setShowCreatePayout(false);
			setPayoutAmount("");
			setPayoutReference("");
			setPayoutPeriodStart("");
			setPayoutPeriodEnd("");
			setPayoutNotes("");
			setPayoutError("");
		},
		onError: (err: Error) => setPayoutError(extractError(err)),
	});

	const updatePayoutStatusMutation = api.updatePayoutStatus.useMutation({
		onSuccess: () => {
			void api.vendorPayouts.invalidate();
			void api.payoutStats.invalidate();
		},
	});

	const stats = statsData?.stats;
	const vendors = vendorsData?.vendors ?? [];
	const payouts = payoutsData?.payouts ?? [];

	const handleCreatePayout = (e: React.FormEvent) => {
		e.preventDefault();
		setPayoutError("");
		if (!selectedVendorId) {
			setPayoutError("Select a vendor first.");
			return;
		}
		const amount = Math.round(Number.parseFloat(payoutAmount) * 100);
		if (Number.isNaN(amount) || amount <= 0) {
			setPayoutError("Enter a valid amount.");
			return;
		}
		if (!payoutPeriodStart || !payoutPeriodEnd) {
			setPayoutError("Period start and end dates are required.");
			return;
		}
		createPayoutMutation.mutate({
			params: { vendorId: selectedVendorId },
			body: {
				amount,
				currency: payoutCurrency,
				periodStart: new Date(payoutPeriodStart),
				periodEnd: new Date(payoutPeriodEnd),
				...(payoutMethod.trim() ? { method: payoutMethod.trim() } : {}),
				...(payoutReference.trim()
					? { reference: payoutReference.trim() }
					: {}),
				...(payoutNotes.trim() ? { notes: payoutNotes.trim() } : {}),
			},
		});
	};

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

			{/* Vendor selector */}
			<div className="mb-5 flex flex-wrap items-center gap-3">
				<select
					value={selectedVendorId}
					onChange={(e) => {
						setSelectedVendorId(e.target.value);
						setShowCreatePayout(false);
					}}
					className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
				>
					<option value="">Select a vendor…</option>
					{vendors.map((v) => (
						<option key={v.id} value={v.id}>
							{v.name}
						</option>
					))}
				</select>
				{selectedVendorId ? (
					<button
						type="button"
						onClick={() => setShowCreatePayout(!showCreatePayout)}
						className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm hover:opacity-90"
					>
						{showCreatePayout ? "Cancel" : "Create Payout"}
					</button>
				) : null}
			</div>

			{/* Create payout form */}
			{showCreatePayout && selectedVendorId ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Payout
					</h2>
					{payoutError ? (
						<div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
							{payoutError}
						</div>
					) : null}
					<form onSubmit={handleCreatePayout} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-3">
							<div>
								<label htmlFor="po-amount" className={labelCls}>
									Amount ($) <span className="text-destructive">*</span>
								</label>
								<input
									id="po-amount"
									type="number"
									step="0.01"
									min="0.01"
									className={inputCls}
									value={payoutAmount}
									onChange={(e) => setPayoutAmount(e.target.value)}
									placeholder="100.00"
								/>
							</div>
							<div>
								<label htmlFor="po-currency" className={labelCls}>
									Currency
								</label>
								<input
									id="po-currency"
									className={inputCls}
									value={payoutCurrency}
									onChange={(e) =>
										setPayoutCurrency(e.target.value.toUpperCase())
									}
									maxLength={3}
									placeholder="USD"
								/>
							</div>
							<div>
								<label htmlFor="po-method" className={labelCls}>
									Method
								</label>
								<input
									id="po-method"
									className={inputCls}
									value={payoutMethod}
									onChange={(e) => setPayoutMethod(e.target.value)}
									placeholder="bank_transfer"
								/>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label htmlFor="po-start" className={labelCls}>
									Period start <span className="text-destructive">*</span>
								</label>
								<input
									id="po-start"
									type="date"
									className={inputCls}
									value={payoutPeriodStart}
									onChange={(e) => setPayoutPeriodStart(e.target.value)}
								/>
							</div>
							<div>
								<label htmlFor="po-end" className={labelCls}>
									Period end <span className="text-destructive">*</span>
								</label>
								<input
									id="po-end"
									type="date"
									className={inputCls}
									value={payoutPeriodEnd}
									onChange={(e) => setPayoutPeriodEnd(e.target.value)}
								/>
							</div>
						</div>
						<div>
							<label htmlFor="po-reference" className={labelCls}>
								Reference
							</label>
							<input
								id="po-reference"
								className={inputCls}
								value={payoutReference}
								onChange={(e) => setPayoutReference(e.target.value)}
								placeholder="Transaction ID or check number"
							/>
						</div>
						<div>
							<label htmlFor="po-notes" className={labelCls}>
								Notes
							</label>
							<input
								id="po-notes"
								className={inputCls}
								value={payoutNotes}
								onChange={(e) => setPayoutNotes(e.target.value)}
								placeholder="Optional notes"
							/>
						</div>
						<button
							type="submit"
							disabled={createPayoutMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createPayoutMutation.isPending ? "Creating..." : "Create Payout"}
						</button>
					</form>
				</div>
			) : null}

			{/* Payout list */}
			{!selectedVendorId ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						Select a vendor above to view their payouts.
					</p>
				</div>
			) : loadingPayouts ? (
				<div className="space-y-2">
					{PAYOUT_SKELETON_IDS.map((id) => (
						<div
							key={`pay-skel-${id}`}
							className="h-12 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : payouts.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No payouts yet.</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-border border-b bg-muted">
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Amount
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Period
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
									<td className="px-4 py-2 font-medium text-foreground">
										{formatCurrency(p.amount, p.currency)}
									</td>
									<td className="px-4 py-2 text-muted-foreground text-xs">
										{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
									</td>
									<td className="px-4 py-2 text-muted-foreground text-xs">
										{p.method ?? "—"}
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
										<select
											value={p.status}
											onChange={(e) =>
												updatePayoutStatusMutation.mutate({
													params: { id: p.id },
													body: {
														status: e.target.value as
															| "pending"
															| "processing"
															| "completed"
															| "failed",
													},
												})
											}
											disabled={updatePayoutStatusMutation.isPending}
											className="rounded border border-border bg-background px-2 py-1 text-xs"
										>
											<option value="pending">Pending</option>
											<option value="processing">Processing</option>
											<option value="completed">Completed</option>
											<option value="failed">Failed</option>
										</select>
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
