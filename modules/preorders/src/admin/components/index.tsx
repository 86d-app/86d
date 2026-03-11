"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
	id: string;
	productId: string;
	productName: string;
	variantId?: string;
	variantLabel?: string;
	paymentType: string;
	depositAmount?: number;
	depositPercent?: number;
	price: number;
	maxQuantity?: number;
	status: string;
	startDate: string;
	endDate?: string;
	estimatedShipDate?: string;
	message?: string;
	totalOrdered: number;
	createdAt: string;
	updatedAt: string;
}

interface PreorderItem {
	id: string;
	campaignId: string;
	customerId: string;
	quantity: number;
	status: string;
	orderId?: string;
	reason?: string;
	createdAt: string;
	updatedAt: string;
}

interface PreorderSummary {
	totalCampaigns: number;
	activeCampaigns: number;
	totalItems: number;
	pendingItems: number;
	fulfilledItems: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function usePreordersApi() {
	const client = useModuleClient();
	return {
		listCampaigns:
			client.module("preorders").admin["/admin/preorders/campaigns"],
		getCampaign:
			client.module("preorders").admin["/admin/preorders/campaigns/:id"],
		createCampaign:
			client.module("preorders").admin["/admin/preorders/campaigns"],
		activateCampaign:
			client.module("preorders").admin[
				"/admin/preorders/campaigns/:id/activate"
			],
		pauseCampaign:
			client.module("preorders").admin["/admin/preorders/campaigns/:id/pause"],
		completeCampaign:
			client.module("preorders").admin[
				"/admin/preorders/campaigns/:id/complete"
			],
		cancelCampaign:
			client.module("preorders").admin["/admin/preorders/campaigns/:id/cancel"],
		notifyCampaign:
			client.module("preorders").admin["/admin/preorders/campaigns/:id/notify"],
		listItems: client.module("preorders").admin["/admin/preorders/items"],
		fulfillItem:
			client.module("preorders").admin["/admin/preorders/items/:id/fulfill"],
		readyItem:
			client.module("preorders").admin["/admin/preorders/items/:id/ready"],
		cancelItem:
			client.module("preorders").admin["/admin/preorders/items/:id/cancel"],
		summary: client.module("preorders").admin["/admin/preorders/summary"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	paused:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ITEM_STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	ready:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
	fulfilled:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
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
// CampaignList — main preorder campaign list + create
// ---------------------------------------------------------------------------

export function CampaignList() {
	const api = usePreordersApi();
	const [statusFilter, setStatusFilter] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [productId, setProductId] = useState("");
	const [productName, setProductName] = useState("");
	const [price, setPrice] = useState(0);
	const [paymentType, setPaymentType] = useState("full");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [estimatedShipDate, setEstimatedShipDate] = useState("");
	const [error, setError] = useState("");

	const { data, isLoading } = api.listCampaigns.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { campaigns?: Campaign[]; total?: number } | undefined;
		isLoading: boolean;
	};
	const { data: summaryData } = api.summary.useQuery({}) as {
		data: { summary?: PreorderSummary } | undefined;
	};

	const createMutation = api.createCampaign.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const activateMutation = api.activateCampaign.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const pauseMutation = api.pauseCampaign.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const completeMutation = api.completeCampaign.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const cancelMutation = api.cancelCampaign.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const campaigns = data?.campaigns ?? [];
	const summary = summaryData?.summary;

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!productId.trim() || !productName.trim() || !startDate) {
			setError("Product ID, name, and start date are required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					productId: productId.trim(),
					productName: productName.trim(),
					price,
					paymentType,
					startDate,
					endDate: endDate || undefined,
					estimatedShipDate: estimatedShipDate || undefined,
				},
			});
			setProductId("");
			setProductName("");
			setPrice(0);
			setPaymentType("full");
			setStartDate("");
			setEndDate("");
			setEstimatedShipDate("");
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleAction = async (
		id: string,
		action: "activate" | "pause" | "complete" | "cancel",
	) => {
		try {
			switch (action) {
				case "activate":
					await activateMutation.mutateAsync({ params: { id } });
					break;
				case "pause":
					await pauseMutation.mutateAsync({ params: { id } });
					break;
				case "complete":
					await completeMutation.mutateAsync({ params: { id } });
					break;
				case "cancel":
					await cancelMutation.mutateAsync({
						params: { id },
						body: {},
					});
					break;
			}
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Preorders</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage preorder campaigns
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Create Campaign"}
				</button>
			</div>

			{/* Summary */}
			{summary ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Campaigns
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{summary.totalCampaigns}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Active
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{summary.activeCampaigns}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Items
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{summary.totalItems}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{summary.pendingItems}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Fulfilled
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{summary.fulfilledItems}
						</p>
					</div>
				</div>
			) : null}

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Campaign
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
									Product ID
								</span>
								<input
									type="text"
									value={productId}
									onChange={(e) => setProductId(e.target.value)}
									placeholder="Product ID"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Product Name
								</span>
								<input
									type="text"
									value={productName}
									onChange={(e) => setProductName(e.target.value)}
									placeholder="Product name"
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
									value={price}
									onChange={(e) =>
										setPrice(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Payment Type
								</span>
								<select
									value={paymentType}
									onChange={(e) => setPaymentType(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								>
									<option value="full">Full Payment</option>
									<option value="deposit">Deposit</option>
								</select>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Start Date
								</span>
								<input
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">End Date</span>
								<input
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Est. Ship Date
								</span>
								<input
									type="date"
									value={estimatedShipDate}
									onChange={(e) => setEstimatedShipDate(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Campaign"}
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
					<option value="draft">Draft</option>
					<option value="active">Active</option>
					<option value="paused">Paused</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			{/* Campaign list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : campaigns.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No preorder campaigns found.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{campaigns.map((c) => (
						<div
							key={c.id}
							className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<a
											href={`/admin/preorders/campaigns/${c.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{c.productName}
										</a>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${CAMPAIGN_STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{c.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{formatCurrency(c.price)}</span>
										<span>
											{c.paymentType === "deposit" ? "Deposit" : "Full Payment"}
										</span>
										<span>
											{formatDate(c.startDate)}
											{c.endDate ? ` – ${formatDate(c.endDate)}` : ""}
										</span>
										{c.totalOrdered > 0 ? (
											<span>{c.totalOrdered} ordered</span>
										) : null}
										{c.estimatedShipDate ? (
											<span>Ships ~{formatDate(c.estimatedShipDate)}</span>
										) : null}
									</div>
								</div>
								<div className="flex gap-1">
									{c.status === "draft" ? (
										<button
											type="button"
											onClick={() => handleAction(c.id, "activate")}
											className="rounded bg-green-50 px-2 py-1 text-green-700 text-xs hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
										>
											Activate
										</button>
									) : null}
									{c.status === "active" ? (
										<>
											<button
												type="button"
												onClick={() => handleAction(c.id, "pause")}
												className="rounded px-2 py-1 text-xs hover:bg-muted"
											>
												Pause
											</button>
											<button
												type="button"
												onClick={() => handleAction(c.id, "complete")}
												className="rounded px-2 py-1 text-xs hover:bg-muted"
											>
												Complete
											</button>
										</>
									) : null}
									{c.status === "paused" ? (
										<button
											type="button"
											onClick={() => handleAction(c.id, "activate")}
											className="rounded bg-green-50 px-2 py-1 text-green-700 text-xs hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
										>
											Resume
										</button>
									) : null}
									{c.status !== "cancelled" && c.status !== "completed" ? (
										<button
											type="button"
											onClick={() => handleAction(c.id, "cancel")}
											className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
										>
											Cancel
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
// CampaignDetail — campaign details + preorder items
// ---------------------------------------------------------------------------

export function CampaignDetail({ params }: { params: { id: string } }) {
	const api = usePreordersApi();

	const { data, isLoading } = api.getCampaign.useQuery({
		params: { id: params.id },
	}) as {
		data:
			| { campaign?: Campaign; items?: PreorderItem[]; error?: string }
			| undefined;
		isLoading: boolean;
	};

	const readyMutation = api.readyItem.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const fulfillMutation = api.fulfillItem.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const cancelItemMutation = api.cancelItem.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const campaign = data?.campaign;
	const items = data?.items ?? [];

	const handleItemAction = async (
		itemId: string,
		action: "ready" | "fulfill" | "cancel",
	) => {
		try {
			switch (action) {
				case "ready":
					await readyMutation.mutateAsync({ params: { id: itemId } });
					break;
				case "fulfill":
					await fulfillMutation.mutateAsync({
						params: { id: itemId },
						body: {},
					});
					break;
				case "cancel":
					await cancelItemMutation.mutateAsync({
						params: { id: itemId },
						body: {},
					});
					break;
			}
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

	if (!campaign) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Campaign not found.</p>
				<a
					href="/admin/preorders"
					className="mt-2 inline-block text-sm underline"
				>
					Back to preorders
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/preorders"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to preorders
				</a>
				<div className="mt-2 flex items-center gap-3">
					<h1 className="font-bold text-foreground text-xl">
						{campaign.productName}
					</h1>
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${CAMPAIGN_STATUS_COLORS[campaign.status] ?? "bg-muted text-muted-foreground"}`}
					>
						{campaign.status}
					</span>
				</div>
			</div>

			{/* Campaign details */}
			<div className="mb-6 grid gap-6 lg:grid-cols-2">
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Campaign Details
					</h2>
					<dl className="space-y-3 text-sm">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Price</dt>
							<dd className="font-medium text-foreground">
								{formatCurrency(campaign.price)}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Payment</dt>
							<dd className="text-foreground">
								{campaign.paymentType === "deposit" ? "Deposit" : "Full"}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Start</dt>
							<dd className="text-foreground">
								{formatDate(campaign.startDate)}
							</dd>
						</div>
						{campaign.endDate ? (
							<div className="flex justify-between">
								<dt className="text-muted-foreground">End</dt>
								<dd className="text-foreground">
									{formatDate(campaign.endDate)}
								</dd>
							</div>
						) : null}
						{campaign.estimatedShipDate ? (
							<div className="flex justify-between">
								<dt className="text-muted-foreground">Est. Ship</dt>
								<dd className="text-foreground">
									{formatDate(campaign.estimatedShipDate)}
								</dd>
							</div>
						) : null}
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Total Ordered</dt>
							<dd className="font-medium text-foreground">
								{campaign.totalOrdered}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			{/* Items */}
			<h2 className="mb-4 font-semibold text-foreground text-lg">
				Preorder Items ({items.length})
			</h2>
			{items.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No preorder items yet.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-border border-b bg-muted">
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Customer
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Qty
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
							{items.map((item) => (
								<tr
									key={item.id}
									className="transition-colors hover:bg-muted/50"
								>
									<td className="px-4 py-2 font-mono text-foreground text-xs">
										{item.customerId.slice(0, 8)}...
									</td>
									<td className="px-4 py-2 text-foreground">{item.quantity}</td>
									<td className="px-4 py-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${ITEM_STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{item.status}
										</span>
									</td>
									<td className="px-4 py-2 text-muted-foreground text-xs">
										{formatDate(item.createdAt)}
									</td>
									<td className="px-4 py-2">
										<div className="flex gap-1">
											{item.status === "pending" ||
											item.status === "confirmed" ? (
												<button
													type="button"
													onClick={() => handleItemAction(item.id, "ready")}
													className="rounded px-2 py-1 text-xs hover:bg-muted"
												>
													Ready
												</button>
											) : null}
											{item.status === "ready" ? (
												<button
													type="button"
													onClick={() => handleItemAction(item.id, "fulfill")}
													className="rounded px-2 py-1 text-green-700 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
												>
													Fulfill
												</button>
											) : null}
											{item.status !== "fulfilled" &&
											item.status !== "cancelled" &&
											item.status !== "refunded" ? (
												<button
													type="button"
													onClick={() => handleItemAction(item.id, "cancel")}
													className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
												>
													Cancel
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
