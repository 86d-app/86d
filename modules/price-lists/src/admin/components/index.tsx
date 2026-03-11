"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceList {
	id: string;
	name: string;
	slug: string;
	description?: string;
	currency?: string;
	priority: number;
	status: string;
	startsAt?: string;
	endsAt?: string;
	customerGroupId?: string;
	createdAt: string;
	updatedAt: string;
}

interface PriceEntry {
	id: string;
	priceListId: string;
	productId: string;
	price: number;
	compareAtPrice?: number;
	minQuantity?: number;
	maxQuantity?: number;
	createdAt: string;
}

interface PriceListStats {
	totalPriceLists: number;
	activePriceLists: number;
	scheduledPriceLists: number;
	inactivePriceLists: number;
	totalEntries: number;
	priceListsWithEntries: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function usePriceListsApi() {
	const client = useModuleClient();
	return {
		list: client.module("price-lists").admin["/admin/price-lists"],
		stats: client.module("price-lists").admin["/admin/price-lists/stats"],
		create: client.module("price-lists").admin["/admin/price-lists/create"],
		detail: client.module("price-lists").admin["/admin/price-lists/:id"],
		update: client.module("price-lists").admin["/admin/price-lists/:id/update"],
		deletePl:
			client.module("price-lists").admin["/admin/price-lists/:id/delete"],
		entries:
			client.module("price-lists").admin["/admin/price-lists/:id/entries"],
		setEntry:
			client.module("price-lists").admin["/admin/price-lists/:id/entries/set"],
		removeEntry:
			client.module("price-lists").admin[
				"/admin/price-lists/:id/entries/:productId/remove"
			],
		bulkSet:
			client.module("price-lists").admin["/admin/price-lists/:id/entries/bulk"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function formatDate(dateStr: string | undefined) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatCurrency(amount: number, currency?: string) {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: currency ?? "USD",
		minimumFractionDigits: 2,
	}).format(amount);
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// PriceListAdmin — list view
// ---------------------------------------------------------------------------

export function PriceListAdmin() {
	const api = usePriceListsApi();
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.list.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { priceLists?: PriceList[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: PriceListStats } | undefined;
	};

	const priceLists = data?.priceLists ?? [];
	const stats = statsData?.stats;

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Price Lists</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage custom pricing for customer groups, B2B, and promotions
					</p>
				</div>
				<a
					href="/admin/price-lists/create"
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					Create price list
				</a>
			</div>

			{/* Stats row */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Active
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.activePriceLists}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Scheduled
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.scheduledPriceLists}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Entries
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalEntries}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							With Entries
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.priceListsWithEntries}
						</p>
					</div>
				</div>
			) : null}

			{/* Filter */}
			<div className="mb-4 flex gap-2">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
					<option value="scheduled">Scheduled</option>
				</select>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : priceLists.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No price lists yet. Create one to set custom pricing for products.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b bg-muted/40">
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Name
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Status
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Priority
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Currency
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Schedule
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{priceLists.map((pl) => (
								<tr key={pl.id} className="hover:bg-muted/30">
									<td className="px-4 py-3">
										<a
											href={`/admin/price-lists/${pl.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{pl.name}
										</a>
										{pl.description ? (
											<p className="mt-0.5 text-muted-foreground text-xs">
												{pl.description}
											</p>
										) : null}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[pl.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{pl.status}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{pl.priority}
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{pl.currency ?? "—"}
									</td>
									<td className="px-4 py-3 text-muted-foreground text-xs">
										{pl.startsAt || pl.endsAt
											? `${formatDate(pl.startsAt)} → ${formatDate(pl.endsAt)}`
											: "Always"}
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
// PriceListCreate
// ---------------------------------------------------------------------------

export function PriceListCreate() {
	const api = usePriceListsApi();
	const createMutation = api.create.useMutation() as {
		mutateAsync: (opts: {
			body: Record<string, unknown>;
		}) => Promise<{ priceList?: PriceList }>;
		isPending: boolean;
	};

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [currency, setCurrency] = useState("");
	const [priority, setPriority] = useState(0);
	const [status, setStatus] = useState("active");
	const [startsAt, setStartsAt] = useState("");
	const [endsAt, setEndsAt] = useState("");
	const [customerGroupId, setCustomerGroupId] = useState("");
	const [error, setError] = useState("");

	const handleNameChange = (val: string) => {
		setName(val);
		setSlug(slugify(val));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!name.trim() || !slug.trim()) {
			setError("Name and slug are required.");
			return;
		}

		try {
			const result = await createMutation.mutateAsync({
				body: {
					name: name.trim(),
					slug: slug.trim(),
					description: description.trim() || undefined,
					currency: currency.trim() || undefined,
					priority,
					status,
					startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
					endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
					customerGroupId: customerGroupId.trim() || undefined,
				},
			});

			if (result.priceList) {
				window.location.href = `/admin/price-lists/${result.priceList.id}`;
			}
		} catch (err) {
			setError(extractError(err));
		}
	};

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/price-lists"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to price lists
				</a>
			</div>

			<h1 className="mb-6 font-bold text-2xl text-foreground">
				Create Price List
			</h1>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Basic Information
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Name</span>
							<input
								type="text"
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="VIP Pricing"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Slug</span>
							<input
								type="text"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="vip-pricing"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
					<div className="mt-4">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Description
							</span>
							<input
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
				</div>

				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Settings
					</h2>
					<div className="grid gap-4 sm:grid-cols-3">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Currency (ISO 4217)
							</span>
							<input
								type="text"
								value={currency}
								onChange={(e) => setCurrency(e.target.value.toUpperCase())}
								placeholder="USD"
								maxLength={3}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Priority (lower = higher)
							</span>
							<input
								type="number"
								value={priority}
								onChange={(e) =>
									setPriority(Number.parseInt(e.target.value, 10) || 0)
								}
								min={0}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Status</span>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
								<option value="scheduled">Scheduled</option>
							</select>
						</label>
					</div>
					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Starts At</span>
							<input
								type="date"
								value={startsAt}
								onChange={(e) => setStartsAt(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Ends At</span>
							<input
								type="date"
								value={endsAt}
								onChange={(e) => setEndsAt(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
					<div className="mt-4">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Customer Group ID
							</span>
							<input
								type="text"
								value={customerGroupId}
								onChange={(e) => setCustomerGroupId(e.target.value)}
								placeholder="Optional — restrict to specific group"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
				</div>

				<div className="flex gap-3">
					<button
						type="submit"
						disabled={createMutation.isPending}
						className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
					>
						{createMutation.isPending ? "Creating..." : "Create Price List"}
					</button>
					<a
						href="/admin/price-lists"
						className="rounded-lg border border-border bg-card px-4 py-2 text-foreground text-sm hover:bg-muted"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// PriceListDetail
// ---------------------------------------------------------------------------

export function PriceListDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";
	const api = usePriceListsApi();

	const { data, isLoading } = api.detail.useQuery({ id }) as {
		data:
			| {
					priceList?: PriceList;
					entries?: PriceEntry[];
					entryCount?: number;
			  }
			| undefined;
		isLoading: boolean;
	};

	const updateMutation = api.update.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.deletePl.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const setEntryMutation = api.setEntry.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const removeEntryMutation = api.removeEntry.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string; productId: string };
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const priceList = data?.priceList;
	const entries = data?.entries ?? [];
	const entryCount = data?.entryCount ?? 0;

	// Add entry form state
	const [newProductId, setNewProductId] = useState("");
	const [newPrice, setNewPrice] = useState("");
	const [newCompareAt, setNewCompareAt] = useState("");
	const [newMinQty, setNewMinQty] = useState("");
	const [newMaxQty, setNewMaxQty] = useState("");
	const [error, setError] = useState("");

	const handleDelete = async () => {
		if (!confirm("Delete this price list and all its entries?")) return;
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.href = "/admin/price-lists";
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		try {
			await updateMutation.mutateAsync({
				params: { id },
				body: { status: newStatus },
			});
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleAddEntry = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!newProductId.trim() || !newPrice.trim()) {
			setError("Product ID and price are required.");
			return;
		}
		try {
			await setEntryMutation.mutateAsync({
				params: { id },
				body: {
					productId: newProductId.trim(),
					price: Number.parseFloat(newPrice),
					...(newCompareAt
						? { compareAtPrice: Number.parseFloat(newCompareAt) }
						: {}),
					...(newMinQty ? { minQuantity: Number.parseInt(newMinQty, 10) } : {}),
					...(newMaxQty ? { maxQuantity: Number.parseInt(newMaxQty, 10) } : {}),
				},
			});
			setNewProductId("");
			setNewPrice("");
			setNewCompareAt("");
			setNewMinQty("");
			setNewMaxQty("");
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleRemoveEntry = async (productId: string) => {
		if (!confirm("Remove this price entry?")) return;
		try {
			await removeEntryMutation.mutateAsync({
				params: { id, productId },
			});
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/price-lists"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to price lists
					</a>
				</div>
				<div className="space-y-4">
					<div className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
					<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
				</div>
			</div>
		);
	}

	if (!priceList) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/price-lists"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to price lists
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">Price list not found.</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/price-lists"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to price lists
				</a>
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Header */}
					<div className="rounded-lg border border-border bg-card p-5">
						<div className="mb-3 flex items-start justify-between gap-3">
							<div>
								<h1 className="font-bold text-foreground text-lg">
									{priceList.name}
								</h1>
								{priceList.description ? (
									<p className="mt-1 text-muted-foreground text-sm">
										{priceList.description}
									</p>
								) : null}
							</div>
							<span
								className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[priceList.status] ?? "bg-muted text-muted-foreground"}`}
							>
								{priceList.status}
							</span>
						</div>
						<div className="flex flex-wrap gap-2 border-border border-t pt-3">
							{priceList.status !== "active" ? (
								<button
									type="button"
									onClick={() => handleStatusChange("active")}
									className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-green-700"
								>
									Activate
								</button>
							) : (
								<button
									type="button"
									onClick={() => handleStatusChange("inactive")}
									className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-foreground text-sm hover:bg-muted"
								>
									Deactivate
								</button>
							)}
							<button
								type="button"
								onClick={handleDelete}
								disabled={deleteMutation.isPending}
								className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								Delete
							</button>
						</div>
					</div>

					{/* Entries */}
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Price Entries ({entryCount})
							</h2>
						</div>

						{entries.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No entries yet. Add product prices below.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-border border-b bg-muted/40">
											<th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
												Product ID
											</th>
											<th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
												Price
											</th>
											<th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
												Compare At
											</th>
											<th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
												Qty Range
											</th>
											<th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{entries.map((entry) => (
											<tr key={entry.id} className="hover:bg-muted/30">
												<td className="px-4 py-2 font-mono text-sm">
													{entry.productId}
												</td>
												<td className="px-4 py-2 text-right text-sm">
													{formatCurrency(entry.price, priceList.currency)}
												</td>
												<td className="px-4 py-2 text-right text-muted-foreground text-sm">
													{entry.compareAtPrice
														? formatCurrency(
																entry.compareAtPrice,
																priceList.currency,
															)
														: "—"}
												</td>
												<td className="px-4 py-2 text-right text-muted-foreground text-sm">
													{entry.minQuantity || entry.maxQuantity
														? `${entry.minQuantity ?? 1}–${entry.maxQuantity ?? "∞"}`
														: "Any"}
												</td>
												<td className="px-4 py-2 text-right">
													<button
														type="button"
														onClick={() => handleRemoveEntry(entry.productId)}
														className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
													>
														Remove
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{/* Add entry form */}
						<div className="border-border border-t p-4">
							<h3 className="mb-3 font-medium text-foreground text-sm">
								Add Price Entry
							</h3>
							<form
								onSubmit={handleAddEntry}
								className="flex flex-wrap items-end gap-2"
							>
								<label className="block">
									<span className="mb-1 block text-muted-foreground text-xs">
										Product ID
									</span>
									<input
										type="text"
										value={newProductId}
										onChange={(e) => setNewProductId(e.target.value)}
										placeholder="prod_..."
										className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-muted-foreground text-xs">
										Price
									</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={newPrice}
										onChange={(e) => setNewPrice(e.target.value)}
										placeholder="0.00"
										className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-muted-foreground text-xs">
										Compare At
									</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={newCompareAt}
										onChange={(e) => setNewCompareAt(e.target.value)}
										placeholder="—"
										className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-muted-foreground text-xs">
										Min Qty
									</span>
									<input
										type="number"
										min="1"
										value={newMinQty}
										onChange={(e) => setNewMinQty(e.target.value)}
										placeholder="—"
										className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-muted-foreground text-xs">
										Max Qty
									</span>
									<input
										type="number"
										min="1"
										value={newMaxQty}
										onChange={(e) => setNewMaxQty(e.target.value)}
										placeholder="—"
										className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
									/>
								</label>
								<button
									type="submit"
									disabled={setEntryMutation.isPending}
									className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
								>
									{setEntryMutation.isPending ? "Adding..." : "Add"}
								</button>
							</form>
						</div>
					</div>
				</div>

				{/* Right sidebar */}
				<div>
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Status</dt>
								<dd className="font-medium text-foreground capitalize">
									{priceList.status}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Slug</dt>
								<dd className="font-medium font-mono text-foreground">
									{priceList.slug}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Priority</dt>
								<dd className="font-medium text-foreground">
									{priceList.priority}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Currency</dt>
								<dd className="font-medium text-foreground">
									{priceList.currency ?? "Default"}
								</dd>
							</div>
							{priceList.customerGroupId ? (
								<div>
									<dt className="text-muted-foreground">Customer Group</dt>
									<dd className="font-medium font-mono text-foreground">
										{priceList.customerGroupId}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Starts</dt>
								<dd className="font-medium text-foreground">
									{formatDate(priceList.startsAt)}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Ends</dt>
								<dd className="font-medium text-foreground">
									{formatDate(priceList.endsAt)}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Entries</dt>
								<dd className="font-medium text-foreground">{entryCount}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Created</dt>
								<dd className="font-medium text-foreground">
									{formatDate(priceList.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Updated</dt>
								<dd className="font-medium text-foreground">
									{formatDate(priceList.updatedAt)}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</div>
	);
}
