"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlashSale {
	id: string;
	name: string;
	slug: string;
	description?: string;
	status: string;
	startsAt: string;
	endsAt: string;
	createdAt: string;
	updatedAt: string;
}

interface FlashSaleProduct {
	id: string;
	flashSaleId: string;
	productId: string;
	salePrice: number;
	originalPrice: number;
	stockLimit?: number;
	stockSold: number;
	sortOrder: number;
	createdAt: string;
}

interface FlashSaleStats {
	totalSales: number;
	draftSales: number;
	scheduledSales: number;
	activeSales: number;
	endedSales: number;
	totalProducts: number;
	totalUnitsSold: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useFlashSalesApi() {
	const client = useModuleClient();
	return {
		list: client.module("flash-sales").admin["/admin/flash-sales"],
		stats: client.module("flash-sales").admin["/admin/flash-sales/stats"],
		create: client.module("flash-sales").admin["/admin/flash-sales/create"],
		get: client.module("flash-sales").admin["/admin/flash-sales/:id"],
		update: client.module("flash-sales").admin["/admin/flash-sales/:id/update"],
		remove: client.module("flash-sales").admin["/admin/flash-sales/:id/delete"],
		listProducts:
			client.module("flash-sales").admin["/admin/flash-sales/:id/products"],
		addProduct:
			client.module("flash-sales").admin["/admin/flash-sales/:id/products/add"],
		removeProduct:
			client.module("flash-sales").admin[
				"/admin/flash-sales/:id/products/:productId/remove"
			],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	ended:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_LABELS: Record<string, string> = {
	draft: "Draft",
	scheduled: "Scheduled",
	active: "Active",
	ended: "Ended",
};

function formatDateTime(dateStr: string) {
	return new Date(dateStr).toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function toDatetimeLocal(dateStr: string) {
	const d = new Date(dateStr);
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}

function discountPercent(original: number, sale: number): number {
	if (original <= 0) return 0;
	return Math.round(((original - sale) / original) * 100);
}

const SALE_LIST_SKELETON_KEYS = ["skel-1", "skel-2", "skel-3"];

// ---------------------------------------------------------------------------
// FlashSaleList — main list page
// ---------------------------------------------------------------------------

export function FlashSaleList() {
	const api = useFlashSalesApi();
	const [statusFilter, setStatusFilter] = useState("");
	const [showCreate, setShowCreate] = useState(false);

	// Create form state
	const [newName, setNewName] = useState("");
	const [newSlug, setNewSlug] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newStartsAt, setNewStartsAt] = useState("");
	const [newEndsAt, setNewEndsAt] = useState("");
	const [newStatus, setNewStatus] = useState("draft");
	const [error, setError] = useState("");

	const { data, isLoading } = api.list.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { sales?: FlashSale[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: FlashSaleStats } | undefined;
	};

	const sales = data?.sales ?? [];
	const stats = statsData?.stats;

	const createMutation = api.create.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.remove.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!newName.trim() || !newStartsAt || !newEndsAt) {
			setError("Name, start date, and end date are required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					name: newName.trim(),
					slug: newSlug.trim() || slugify(newName),
					description: newDescription.trim() || undefined,
					status: newStatus,
					startsAt: new Date(newStartsAt).toISOString(),
					endsAt: new Date(newEndsAt).toISOString(),
				},
			});
			setNewName("");
			setNewSlug("");
			setNewDescription("");
			setNewStartsAt("");
			setNewEndsAt("");
			setNewStatus("draft");
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this flash sale?")) return;
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
					<h1 className="font-bold text-2xl text-foreground">Flash Sales</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Create and manage time-limited flash sales
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Create flash sale"}
				</button>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Sales
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalSales}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Active
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.activeSales}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Scheduled
						</p>
						<p className="mt-1 font-bold text-2xl text-blue-600">
							{stats.scheduledSales}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Products
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalProducts}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Units Sold
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalUnitsSold}
						</p>
					</div>
				</div>
			) : null}

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Flash Sale
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
									value={newName}
									onChange={(e) => {
										setNewName(e.target.value);
										if (!newSlug) {
											setNewSlug(slugify(e.target.value));
										}
									}}
									placeholder="Summer Blowout"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={newSlug}
									onChange={(e) => setNewSlug(e.target.value)}
									placeholder="summer-blowout"
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
								value={newDescription}
								onChange={(e) => setNewDescription(e.target.value)}
								placeholder="Optional description"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<div className="grid gap-4 sm:grid-cols-3">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Status</span>
								<select
									value={newStatus}
									onChange={(e) => setNewStatus(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								>
									<option value="draft">Draft</option>
									<option value="scheduled">Scheduled</option>
									<option value="active">Active</option>
								</select>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Starts At
								</span>
								<input
									type="datetime-local"
									value={newStartsAt}
									onChange={(e) => setNewStartsAt(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Ends At</span>
								<input
									type="datetime-local"
									value={newEndsAt}
									onChange={(e) => setNewEndsAt(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Flash Sale"}
						</button>
					</form>
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
					<option value="draft">Draft</option>
					<option value="scheduled">Scheduled</option>
					<option value="active">Active</option>
					<option value="ended">Ended</option>
				</select>
			</div>

			{/* Sale list */}
			{isLoading ? (
				<div className="space-y-3">
					{SALE_LIST_SKELETON_KEYS.map((key) => (
						<div
							key={key}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : sales.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No flash sales yet. Create one to start offering time-limited deals.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{sales.map((sale) => (
						<div
							key={sale.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<a
											href={`/admin/flash-sales/${sale.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{sale.name}
										</a>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[sale.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{STATUS_LABELS[sale.status] ?? sale.status}
										</span>
									</div>
									<p className="mt-1 text-muted-foreground text-xs">
										{formatDateTime(sale.startsAt)} &mdash;{" "}
										{formatDateTime(sale.endsAt)}
									</p>
									{sale.description ? (
										<p className="mt-0.5 text-muted-foreground text-xs">
											{sale.description}
										</p>
									) : null}
								</div>
								<div className="flex gap-1">
									<a
										href={`/admin/flash-sales/${sale.id}`}
										className="rounded px-2 py-1 text-xs hover:bg-muted"
									>
										Manage
									</a>
									<button
										type="button"
										onClick={() => handleDelete(sale.id)}
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

// ---------------------------------------------------------------------------
// FlashSaleDetail — single sale view with product management
// ---------------------------------------------------------------------------

export function FlashSaleDetail({ params }: { params: { id: string } }) {
	const api = useFlashSalesApi();

	// Edit form state
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState("draft");
	const [startsAt, setStartsAt] = useState("");
	const [endsAt, setEndsAt] = useState("");
	const [initialized, setInitialized] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	// Add product form
	const [showAddProduct, setShowAddProduct] = useState(false);
	const [productId, setProductId] = useState("");
	const [salePrice, setSalePrice] = useState(0);
	const [originalPrice, setOriginalPrice] = useState(0);
	const [stockLimit, setStockLimit] = useState("");
	const [productError, setProductError] = useState("");

	const { data, isLoading } = api.get.useQuery({
		params: { id: params.id },
	}) as {
		data:
			| {
					sale?: FlashSale;
					products?: FlashSaleProduct[];
					productCount?: number;
					error?: string;
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
	const addProductMutation = api.addProduct.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const removeProductMutation = api.removeProduct.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string; productId: string };
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const sale = data?.sale;
	const products = data?.products ?? [];

	if (sale && !initialized) {
		setName(sale.name);
		setSlug(sale.slug);
		setDescription(sale.description ?? "");
		setStatus(sale.status);
		setStartsAt(toDatetimeLocal(sale.startsAt));
		setEndsAt(toDatetimeLocal(sale.endsAt));
		setInitialized(true);
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSaved(false);
		if (!name.trim()) {
			setError("Name is required.");
			return;
		}
		try {
			await updateMutation.mutateAsync({
				params: { id: params.id },
				body: {
					name: name.trim(),
					slug: slug.trim() || slugify(name),
					description: description.trim() || null,
					status,
					startsAt: new Date(startsAt).toISOString(),
					endsAt: new Date(endsAt).toISOString(),
				},
			});
			setSaved(true);
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleAddProduct = async (e: React.FormEvent) => {
		e.preventDefault();
		setProductError("");
		if (!productId.trim() || salePrice <= 0 || originalPrice <= 0) {
			setProductError(
				"Product ID, sale price, and original price are required.",
			);
			return;
		}
		try {
			const body: Record<string, unknown> = {
				productId: productId.trim(),
				salePrice,
				originalPrice,
			};
			if (stockLimit) body.stockLimit = Number.parseInt(stockLimit, 10);
			await addProductMutation.mutateAsync({
				params: { id: params.id },
				body,
			});
			setProductId("");
			setSalePrice(0);
			setOriginalPrice(0);
			setStockLimit("");
			setShowAddProduct(false);
			window.location.reload();
		} catch (err) {
			setProductError(extractError(err));
		}
	};

	const handleRemoveProduct = async (pid: string) => {
		if (!confirm("Remove this product from the flash sale?")) return;
		try {
			await removeProductMutation.mutateAsync({
				params: { id: params.id, productId: pid },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (!sale) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Flash sale not found.</p>
				<a
					href="/admin/flash-sales"
					className="mt-2 inline-block text-sm underline"
				>
					Back to flash sales
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/flash-sales"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to flash sales
				</a>
				<div className="mt-2 flex items-center gap-2">
					<h1 className="font-bold text-foreground text-xl">{sale.name}</h1>
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[sale.status] ?? "bg-muted text-muted-foreground"}`}
					>
						{STATUS_LABELS[sale.status] ?? sale.status}
					</span>
				</div>
			</div>

			{/* Sale details form */}
			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}
			{saved ? (
				<div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
					Flash sale saved successfully.
				</div>
			) : null}

			<form
				onSubmit={handleSave}
				className="mb-8 space-y-4 rounded-lg border border-border bg-card p-5"
			>
				<h2 className="font-semibold text-foreground text-sm">Sale Details</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Slug</span>
						<input
							type="text"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
				</div>
				<label className="block">
					<span className="mb-1 block font-medium text-sm">Description</span>
					<input
						type="text"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Optional"
						className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					/>
				</label>
				<div className="grid gap-4 sm:grid-cols-3">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Status</span>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						>
							<option value="draft">Draft</option>
							<option value="scheduled">Scheduled</option>
							<option value="active">Active</option>
							<option value="ended">Ended</option>
						</select>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Starts At</span>
						<input
							type="datetime-local"
							value={startsAt}
							onChange={(e) => setStartsAt(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Ends At</span>
						<input
							type="datetime-local"
							value={endsAt}
							onChange={(e) => setEndsAt(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
				</div>
				<button
					type="submit"
					disabled={updateMutation.isPending}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
				>
					{updateMutation.isPending ? "Saving..." : "Save Changes"}
				</button>
			</form>

			{/* Products section */}
			<div className="rounded-lg border border-border bg-card p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-foreground text-sm">
						Products ({products.length})
					</h2>
					<button
						type="button"
						onClick={() => setShowAddProduct(!showAddProduct)}
						className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-sm hover:bg-muted"
					>
						{showAddProduct ? "Cancel" : "Add product"}
					</button>
				</div>

				{/* Add product form */}
				{showAddProduct ? (
					<div className="mb-4 rounded-lg border border-border border-dashed p-4">
						{productError ? (
							<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
								{productError}
							</div>
						) : null}
						<form
							onSubmit={handleAddProduct}
							className="grid gap-3 sm:grid-cols-5"
						>
							<label className="block">
								<span className="mb-1 block font-medium text-xs">
									Product ID
								</span>
								<input
									type="text"
									value={productId}
									onChange={(e) => setProductId(e.target.value)}
									placeholder="prod_123"
									className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-xs">
									Original Price (cents)
								</span>
								<input
									type="number"
									value={originalPrice}
									onChange={(e) =>
										setOriginalPrice(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-xs">
									Sale Price (cents)
								</span>
								<input
									type="number"
									value={salePrice}
									onChange={(e) =>
										setSalePrice(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-xs">
									Stock Limit
								</span>
								<input
									type="number"
									value={stockLimit}
									onChange={(e) => setStockLimit(e.target.value)}
									placeholder="No limit"
									min={1}
									className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								/>
							</label>
							<button
								type="submit"
								disabled={addProductMutation.isPending}
								className="self-end rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
							>
								{addProductMutation.isPending ? "Adding..." : "Add"}
							</button>
						</form>
					</div>
				) : null}

				{/* Product list */}
				{products.length === 0 ? (
					<div className="rounded-lg border border-border bg-muted/10 p-6 text-center">
						<p className="text-muted-foreground text-sm">
							No products in this flash sale yet.
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{products.map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
							>
								<div className="min-w-0 flex-1">
									<p className="font-mono text-foreground text-sm">
										{p.productId}
									</p>
									<p className="mt-0.5 text-muted-foreground text-xs">
										<span className="line-through">
											{formatCurrency(p.originalPrice)}
										</span>
										{" \u2192 "}
										<span className="font-medium text-green-600">
											{formatCurrency(p.salePrice)}
										</span>{" "}
										({discountPercent(p.originalPrice, p.salePrice)}% off)
										{p.stockLimit != null
											? ` \u00B7 Stock: ${p.stockSold}/${p.stockLimit}`
											: ` \u00B7 Sold: ${p.stockSold}`}
									</p>
								</div>
								<button
									type="button"
									onClick={() => handleRemoveProduct(p.productId)}
									className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Remove
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
