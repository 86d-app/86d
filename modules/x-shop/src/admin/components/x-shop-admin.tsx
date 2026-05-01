"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
	status: "connected" | "not_configured" | "error";
	error?: string;
	configured: boolean;
	username?: string;
	name?: string;
	userId?: string;
	merchantId: string | null;
	apiKey: string | null;
}

interface ChannelStats {
	totalListings: number;
	activeListings: number;
	pendingListings: number;
	failedListings: number;
	totalOrders: number;
	pendingOrders: number;
	shippedOrders: number;
	deliveredOrders: number;
	cancelledOrders: number;
	totalRevenue: number;
}

interface Listing {
	id: string;
	localProductId: string;
	externalProductId?: string;
	title: string;
	status: string;
	syncStatus: string;
	lastSyncedAt?: string;
	error?: string;
	createdAt: string;
}

interface ChannelOrder {
	id: string;
	externalOrderId: string;
	status: string;
	subtotal: number;
	shippingFee: number;
	platformFee: number;
	total: number;
	customerName?: string;
	createdAt: string;
}

interface ProductDrop {
	id: string;
	name: string;
	description?: string;
	productIds: string[];
	launchDate: string;
	endDate?: string;
	status: string;
	tweetId?: string;
	impressions: number;
	clicks: number;
	conversions: number;
	createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

const STATUS_STYLES: Record<string, string> = {
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	suspended:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const SYNC_STYLES: Record<string, string> = {
	synced:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	outdated:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const ORDER_STYLES: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	shipped:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	delivered:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	refunded:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const DROP_STYLES: Record<string, string> = {
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	live: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	ended: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ── API hook ─────────────────────────────────────────────────────────────────

function useXShopApi() {
	const client = useModuleClient();
	const mod = client.module("x-shop");
	return {
		settings: mod.admin["/admin/x-shop/settings"],
		stats: mod.admin["/admin/x-shop/stats"],
		listings: mod.admin["/admin/x-shop/listings"],
		orders: mod.admin["/admin/x-shop/orders"],
		drops: mod.admin["/admin/x-shop/drops"],
		createDrop: mod.admin["/admin/x-shop/drops/create"],
	};
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded bg-muted ${className}`}
			aria-hidden="true"
		/>
	);
}

function StatCard({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail?: string;
}) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="font-semibold text-2xl text-foreground tabular-nums">
				{value}
			</span>
			{detail && (
				<span className="text-muted-foreground text-xs">{detail}</span>
			)}
		</div>
	);
}

function ConnectionStatus({ settings }: { settings: SettingsData }) {
	if (settings.status === "connected") {
		return (
			<div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-2.5 rounded-full bg-green-500" />
						<span className="font-medium text-foreground text-sm">
							Connected to X
						</span>
					</div>
					<span className="rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-400">
						Active
					</span>
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{settings.username && (
						<div className="flex flex-col gap-0.5">
							<span className="text-muted-foreground text-xs">Account</span>
							<span className="font-medium font-mono text-foreground text-sm">
								@{settings.username}
							</span>
						</div>
					)}
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground text-xs">Merchant ID</span>
						<span className="font-medium font-mono text-foreground text-sm">
							{settings.merchantId ?? "\u2014"}
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground text-xs">API Key</span>
						<span className="font-medium font-mono text-foreground text-sm">
							{settings.apiKey}
						</span>
					</div>
				</div>
			</div>
		);
	}

	if (settings.status === "error") {
		return (
			<div className="flex flex-col gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-2.5 rounded-full bg-red-500" />
						<span className="font-medium text-foreground text-sm">
							Connection Error
						</span>
					</div>
					<span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-800 text-xs dark:bg-red-900/30 dark:text-red-400">
						Invalid
					</span>
				</div>
				<p className="break-words text-muted-foreground text-sm">
					{settings.error ??
						"X rejected the supplied credentials. Verify the API key, secret, and access token haven't expired."}
				</p>
				<p className="text-muted-foreground text-xs">
					OAuth 2.0 access tokens expire after 2 hours. Set{" "}
					<code className="rounded bg-muted px-1">X_REFRESH_TOKEN</code> so the
					module can renew the token automatically.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
			<div className="flex items-center gap-2">
				<div className="size-2.5 rounded-full bg-amber-500" />
				<span className="font-medium text-foreground text-sm">
					Not Configured
				</span>
			</div>
			<p className="text-muted-foreground text-sm">
				Set the <code className="rounded bg-muted px-1 text-xs">X_API_KEY</code>
				, <code className="rounded bg-muted px-1 text-xs">X_API_SECRET</code>,
				and{" "}
				<code className="rounded bg-muted px-1 text-xs">X_ACCESS_TOKEN</code>{" "}
				environment variables to connect your X account. Optionally set{" "}
				<code className="rounded bg-muted px-1 text-xs">X_REFRESH_TOKEN</code>{" "}
				for automatic token renewal.
			</p>
		</div>
	);
}

function Pagination({
	page,
	setPage,
	itemCount,
}: {
	page: number;
	setPage: (fn: (p: number) => number) => void;
	itemCount: number;
}) {
	if (itemCount <= PAGE_SIZE && page === 1) return null;

	return (
		<div className="flex items-center justify-between border-border border-t px-5 py-3">
			<span className="text-muted-foreground text-sm">Page {page}</span>
			<span className="space-x-2">
				<button
					type="button"
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					disabled={page === 1}
					className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
				>
					Previous
				</button>
				<button
					type="button"
					onClick={() => setPage((p) => p + 1)}
					disabled={itemCount < PAGE_SIZE}
					className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
				>
					Next
				</button>
			</span>
		</div>
	);
}

// ── Tab: Listings ────────────────────────────────────────────────────────────

function ListingsTab() {
	const api = useXShopApi();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.listings.useQuery({
		page: String(page),
		limit: String(PAGE_SIZE),
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { listings: Listing[]; total: number } | undefined;
		isLoading: boolean;
	};

	const listings = data?.listings ?? [];

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<select
					value={statusFilter}
					onChange={(e) => {
						setStatusFilter(e.target.value);
						setPage(() => 1);
					}}
					className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Statuses</option>
					<option value="active">Active</option>
					<option value="draft">Draft</option>
					<option value="pending">Pending</option>
					<option value="rejected">Rejected</option>
					<option value="suspended">Suspended</option>
				</select>
			</div>

			{isLoading ? (
				<div className="rounded-lg border border-border bg-card">
					<div className="hidden md:block">
						<table className="w-full text-left text-sm">
							<tbody className="divide-y divide-border">
								{Array.from({ length: 5 }, (_, i) => (
									<tr key={`listing-skeleton-${i}`}>
										{Array.from({ length: 4 }, (_, j) => (
											<td
												key={`listing-skeleton-cell-${j}`}
												className="px-5 py-3"
											>
												<Skeleton className="h-4 rounded" />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="space-y-3 p-4 md:hidden">
						{Array.from({ length: 3 }, (_, i) => (
							<Skeleton
								key={`listing-mobile-skeleton-${i}`}
								className="h-16 rounded-lg"
							/>
						))}
					</div>
				</div>
			) : listings.length === 0 ? (
				<div className="rounded-lg border border-border bg-card px-5 py-12 text-center">
					<p className="font-medium text-foreground text-sm">No listings</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{statusFilter
							? "No listings match the selected filter."
							: "Products will appear here once synced to X Commerce."}
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<div className="hidden md:block">
						<table className="w-full text-left text-sm">
							<thead className="border-border border-b bg-muted/50">
								<tr>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Product
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Status
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Sync
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Last Synced
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{listings.map((listing) => (
									<tr key={listing.id} className="hover:bg-muted/30">
										<td className="max-w-[280px] truncate px-5 py-3 text-foreground">
											{listing.title}
										</td>
										<td className="px-5 py-3">
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_STYLES[listing.status] ?? ""}`}
											>
												{listing.status}
											</span>
										</td>
										<td className="px-5 py-3">
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${SYNC_STYLES[listing.syncStatus] ?? ""}`}
											>
												{listing.syncStatus}
											</span>
										</td>
										<td className="px-5 py-3 text-muted-foreground">
											{listing.lastSyncedAt
												? formatDate(listing.lastSyncedAt)
												: "Never"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="divide-y divide-border md:hidden">
						{listings.map((listing) => (
							<div key={listing.id} className="px-5 py-3">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-foreground text-sm">
											{listing.title}
										</p>
										<div className="mt-1 flex gap-1.5">
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_STYLES[listing.status] ?? ""}`}
											>
												{listing.status}
											</span>
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${SYNC_STYLES[listing.syncStatus] ?? ""}`}
											>
												{listing.syncStatus}
											</span>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					<Pagination
						page={page}
						setPage={setPage}
						itemCount={listings.length}
					/>
				</div>
			)}
		</div>
	);
}

// ── Tab: Orders ──────────────────────────────────────────────────────────────

function OrdersTab() {
	const api = useXShopApi();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.orders.useQuery({
		page: String(page),
		limit: String(PAGE_SIZE),
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { orders: ChannelOrder[]; total: number } | undefined;
		isLoading: boolean;
	};

	const orders = data?.orders ?? [];

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<select
					value={statusFilter}
					onChange={(e) => {
						setStatusFilter(e.target.value);
						setPage(() => 1);
					}}
					className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Statuses</option>
					<option value="pending">Pending</option>
					<option value="confirmed">Confirmed</option>
					<option value="shipped">Shipped</option>
					<option value="delivered">Delivered</option>
					<option value="cancelled">Cancelled</option>
					<option value="refunded">Refunded</option>
				</select>
			</div>

			{isLoading ? (
				<div className="rounded-lg border border-border bg-card">
					<div className="hidden md:block">
						<table className="w-full text-left text-sm">
							<tbody className="divide-y divide-border">
								{Array.from({ length: 5 }, (_, i) => (
									<tr key={`order-skeleton-${i}`}>
										{Array.from({ length: 4 }, (_, j) => (
											<td
												key={`order-skeleton-cell-${j}`}
												className="px-5 py-3"
											>
												<Skeleton className="h-4 rounded" />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="space-y-3 p-4 md:hidden">
						{Array.from({ length: 3 }, (_, i) => (
							<Skeleton
								key={`order-mobile-skeleton-${i}`}
								className="h-16 rounded-lg"
							/>
						))}
					</div>
				</div>
			) : orders.length === 0 ? (
				<div className="rounded-lg border border-border bg-card px-5 py-12 text-center">
					<p className="font-medium text-foreground text-sm">No orders</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{statusFilter
							? "No orders match the selected filter."
							: "Orders from X Commerce will appear here."}
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<div className="hidden md:block">
						<table className="w-full text-left text-sm">
							<thead className="border-border border-b bg-muted/50">
								<tr>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Order ID
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Customer
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Status
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Total
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Platform Fee
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Date
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{orders.map((order) => (
									<tr key={order.id} className="hover:bg-muted/30">
										<td className="px-5 py-3 font-mono text-foreground text-xs">
											{order.externalOrderId}
										</td>
										<td className="px-5 py-3 text-foreground">
											{order.customerName ?? "\u2014"}
										</td>
										<td className="px-5 py-3">
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${ORDER_STYLES[order.status] ?? ""}`}
											>
												{order.status}
											</span>
										</td>
										<td className="px-5 py-3 text-foreground tabular-nums">
											{formatCurrency(order.total)}
										</td>
										<td className="px-5 py-3 text-muted-foreground tabular-nums">
											{formatCurrency(order.platformFee)}
										</td>
										<td className="px-5 py-3 text-muted-foreground">
											{formatDate(order.createdAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="divide-y divide-border md:hidden">
						{orders.map((order) => (
							<div key={order.id} className="px-5 py-3">
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="font-medium text-foreground text-sm">
											{order.customerName ?? order.externalOrderId}
										</p>
										<p className="mt-0.5 text-muted-foreground text-sm tabular-nums">
											{formatCurrency(order.total)}
										</p>
									</div>
									<span
										className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${ORDER_STYLES[order.status] ?? ""}`}
									>
										{order.status}
									</span>
								</div>
							</div>
						))}
					</div>

					<Pagination page={page} setPage={setPage} itemCount={orders.length} />
				</div>
			)}
		</div>
	);
}

// ── Tab: Drops ───────────────────────────────────────────────────────────────

function DropsTab() {
	const api = useXShopApi();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.drops.useQuery({
		page: String(page),
		limit: String(PAGE_SIZE),
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { drops: ProductDrop[]; total: number } | undefined;
		isLoading: boolean;
	};

	const drops = data?.drops ?? [];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<select
					value={statusFilter}
					onChange={(e) => {
						setStatusFilter(e.target.value);
						setPage(() => 1);
					}}
					className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Statuses</option>
					<option value="scheduled">Scheduled</option>
					<option value="live">Live</option>
					<option value="ended">Ended</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			{isLoading ? (
				<div className="rounded-lg border border-border bg-card">
					<div className="hidden md:block">
						<table className="w-full text-left text-sm">
							<tbody className="divide-y divide-border">
								{Array.from({ length: 5 }, (_, i) => (
									<tr key={`drop-skeleton-${i}`}>
										{Array.from({ length: 4 }, (_, j) => (
											<td key={`drop-skeleton-cell-${j}`} className="px-5 py-3">
												<Skeleton className="h-4 rounded" />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="space-y-3 p-4 md:hidden">
						{Array.from({ length: 3 }, (_, i) => (
							<Skeleton
								key={`drop-mobile-skeleton-${i}`}
								className="h-16 rounded-lg"
							/>
						))}
					</div>
				</div>
			) : drops.length === 0 ? (
				<div className="rounded-lg border border-border bg-card px-5 py-12 text-center">
					<p className="font-medium text-foreground text-sm">
						No product drops
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{statusFilter
							? "No drops match the selected filter."
							: "Create a product drop to promote limited-time offers on X."}
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<div className="hidden md:block">
						<table className="w-full text-left text-sm">
							<thead className="border-border border-b bg-muted/50">
								<tr>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Drop
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Status
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Products
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Impressions
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Conversions
									</th>
									<th className="px-5 py-2.5 font-medium text-muted-foreground">
										Launch
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{drops.map((drop) => (
									<tr key={drop.id} className="hover:bg-muted/30">
										<td className="max-w-[220px] truncate px-5 py-3 text-foreground">
											{drop.name}
										</td>
										<td className="px-5 py-3">
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${DROP_STYLES[drop.status] ?? ""}`}
											>
												{drop.status}
											</span>
										</td>
										<td className="px-5 py-3 text-foreground tabular-nums">
											{drop.productIds.length}
										</td>
										<td className="px-5 py-3 text-foreground tabular-nums">
											{drop.impressions.toLocaleString()}
										</td>
										<td className="px-5 py-3 text-foreground tabular-nums">
											{drop.conversions.toLocaleString()}
										</td>
										<td className="px-5 py-3 text-muted-foreground">
											{formatDate(drop.launchDate)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="divide-y divide-border md:hidden">
						{drops.map((drop) => (
							<div key={drop.id} className="px-5 py-3">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-foreground text-sm">
											{drop.name}
										</p>
										<div className="mt-1 flex items-center gap-2">
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${DROP_STYLES[drop.status] ?? ""}`}
											>
												{drop.status}
											</span>
											<span className="text-muted-foreground text-xs">
												{drop.productIds.length} products
											</span>
										</div>
									</div>
									<span className="text-muted-foreground text-xs tabular-nums">
										{drop.impressions.toLocaleString()} views
									</span>
								</div>
							</div>
						))}
					</div>

					<Pagination page={page} setPage={setPage} itemCount={drops.length} />
				</div>
			)}
		</div>
	);
}

// ── Main component ───────────────────────────────────────────────────────────

export function XShopAdmin() {
	const api = useXShopApi();
	const [activeTab, setActiveTab] = useState<"listings" | "orders" | "drops">(
		"listings",
	);

	const { data: settingsData, isLoading: settingsLoading } =
		api.settings.useQuery({}) as {
			data: SettingsData | undefined;
			isLoading: boolean;
		};

	const { data: statsData, isLoading: statsLoading } = api.stats.useQuery(
		{},
	) as {
		data: { stats: ChannelStats } | undefined;
		isLoading: boolean;
	};

	const stats = statsData?.stats;

	if (settingsLoading) {
		return (
			<div className="space-y-6 p-1">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-28 w-full rounded-lg" />
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				<Skeleton className="h-64 w-full rounded-lg" />
			</div>
		);
	}

	return (
		<div className="space-y-8 p-1">
			<div>
				<h2 className="font-semibold text-foreground text-lg">X Shop</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage product listings, orders, and promotional drops on X Commerce.
				</p>
			</div>

			{settingsData && <ConnectionStatus settings={settingsData} />}

			{statsLoading ? (
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
			) : stats ? (
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					<StatCard
						label="Listings"
						value={String(stats.totalListings)}
						detail={`${stats.activeListings} active`}
					/>
					<StatCard
						label="Pending"
						value={String(stats.pendingListings)}
						detail={
							stats.failedListings > 0
								? `${stats.failedListings} failed`
								: "Awaiting review"
						}
					/>
					<StatCard
						label="Orders"
						value={String(stats.totalOrders)}
						detail={`${stats.shippedOrders} shipped, ${stats.deliveredOrders} delivered`}
					/>
					<StatCard
						label="Revenue"
						value={formatCurrency(stats.totalRevenue)}
						detail={`${stats.pendingOrders} pending`}
					/>
				</div>
			) : null}

			<div className="flex gap-1 border-border border-b">
				<button
					type="button"
					onClick={() => setActiveTab("listings")}
					className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
						activeTab === "listings"
							? "border-foreground text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					Listings
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("orders")}
					className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
						activeTab === "orders"
							? "border-foreground text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					Orders
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("drops")}
					className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
						activeTab === "drops"
							? "border-foreground text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					Drops
				</button>
			</div>

			{activeTab === "listings" && <ListingsTab />}
			{activeTab === "orders" && <OrdersTab />}
			{activeTab === "drops" && <DropsTab />}
		</div>
	);
}
