"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	paymentStatus: string;
	subtotal: number;
	total: number;
	currency: string;
	createdAt: string;
}

interface OrderListResponse {
	orders: Order[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

const STATUS_STYLES: Record<string, string> = {
	pending:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	processing: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	on_hold:
		"bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
	completed:
		"bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	cancelled: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
	refunded:
		"bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

function StatusBadge({ value }: { value: string }) {
	const colorClass =
		STATUS_STYLES[value] ??
		"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
	return (
		<span
			className={`inline-block rounded-full px-2 py-0.5 font-medium text-xs capitalize ${colorClass}`}
		>
			{value.replace(/_/g, " ")}
		</span>
	);
}

// ── Account Page ────────────────────────────────────────────────────────────

export default function AccountPage() {
	const client = useModuleClient();
	const [page, setPage] = useState(1);

	const ordersApi = client.module("orders").store["/orders/me"];

	const { data: ordersData, isLoading: ordersLoading } = ordersApi.useQuery({
		page: String(page),
		limit: "5",
	}) as {
		data: OrderListResponse | undefined;
		isLoading: boolean;
	};

	const orders = ordersData?.orders ?? [];
	const pages = ordersData?.pages ?? 1;

	return (
		<div>
			{/* Quick nav cards — visible on mobile where sidebar is hidden */}
			<div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
				<QuickNavCard
					href="/account/orders"
					label="Orders"
					sub="Order history"
				/>
				<QuickNavCard href="/account/profile" label="Profile" sub="Edit info" />
				<QuickNavCard
					href="/account/addresses"
					label="Addresses"
					sub="Address book"
				/>
				<QuickNavCard
					href="/account/wishlist"
					label="Wishlist"
					sub="Saved items"
				/>
				<QuickNavCard
					href="/account/subscriptions"
					label="Subscriptions"
					sub="Plans"
				/>
				<QuickNavCard
					href="/account/downloads"
					label="Downloads"
					sub="Digital files"
				/>
			</div>

			{/* Recent orders */}
			<section>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-foreground text-lg">
						Recent Orders
					</h2>
					{ordersData && ordersData.total > 0 && (
						<a
							href="/account/orders"
							className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							View all &rarr;
						</a>
					)}
				</div>

				{ordersLoading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((n) => (
							<div
								key={n}
								className="h-[72px] animate-pulse rounded-xl bg-muted"
							/>
						))}
					</div>
				) : orders.length === 0 ? (
					<div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
						<p className="font-medium text-foreground text-sm">No orders yet</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Your order history will appear here after your first purchase.
						</p>
						<a
							href="/products"
							className="mt-4 inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2 font-semibold text-background text-sm transition-opacity hover:opacity-90"
						>
							Start shopping
						</a>
					</div>
				) : (
					<>
						<div className="overflow-hidden rounded-xl border border-border">
							{orders.map((order) => (
								<a
									key={order.id}
									href={`/account/orders/${order.id}`}
									className="flex items-center justify-between gap-4 border-border border-b px-4 py-4 transition-colors last:border-0 hover:bg-muted/40"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="font-medium text-foreground text-sm">
												{order.orderNumber}
											</span>
											<StatusBadge value={order.status} />
										</div>
										<p className="mt-0.5 text-muted-foreground text-xs">
											{formatDate(order.createdAt)}
										</p>
									</div>
									<div className="flex shrink-0 items-center gap-3">
										<span className="font-medium text-foreground text-sm tabular-nums">
											{formatPrice(order.total, order.currency)}
										</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="text-muted-foreground"
											aria-hidden="true"
										>
											<path d="m9 18 6-6-6-6" />
										</svg>
									</div>
								</a>
							))}
						</div>

						{/* Pagination */}
						{pages > 1 && (
							<div className="mt-4 flex items-center justify-center gap-2">
								<button
									type="button"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
									className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-40"
								>
									Previous
								</button>
								<span className="px-2 text-muted-foreground text-sm">
									Page {page} of {pages}
								</span>
								<button
									type="button"
									disabled={page >= pages}
									onClick={() => setPage((p) => p + 1)}
									className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-40"
								>
									Next
								</button>
							</div>
						)}
					</>
				)}
			</section>
		</div>
	);
}

function QuickNavCard({
	href,
	label,
	sub,
}: {
	href: string;
	label: string;
	sub: string;
}) {
	return (
		<a
			href={href}
			className="rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
		>
			<p className="font-medium text-foreground text-sm">{label}</p>
			<p className="text-muted-foreground text-xs">{sub}</p>
		</a>
	);
}
