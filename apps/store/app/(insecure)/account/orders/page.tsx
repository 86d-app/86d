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

const PAYMENT_STYLES: Record<string, string> = {
	unpaid: "bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
	paid: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	partially_paid:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	refunded:
		"bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
	voided: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function StatusBadge({
	value,
	styles,
}: {
	value: string;
	styles: Record<string, string>;
}) {
	const colorClass =
		styles[value] ??
		"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
	return (
		<span
			className={`inline-block rounded-full px-2 py-0.5 font-medium text-xs capitalize ${colorClass}`}
		>
			{value.replace(/_/g, " ")}
		</span>
	);
}

// ── Orders Page ─────────────────────────────────────────────────────────────

export default function OrdersPage() {
	const client = useModuleClient();
	const [page, setPage] = useState(1);

	const ordersApi = client.module("orders").store["/orders/me"];

	const { data, isLoading } = ordersApi.useQuery({
		page: String(page),
		limit: "10",
	}) as {
		data: OrderListResponse | undefined;
		isLoading: boolean;
	};

	const orders = data?.orders ?? [];
	const pages = data?.pages ?? 1;
	const total = data?.total ?? 0;

	return (
		<div>
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="font-bold font-display text-foreground text-xl tracking-tight sm:text-2xl">
						Order History
					</h2>
					{total > 0 && (
						<p className="mt-1 text-muted-foreground text-sm">
							{total} order{total !== 1 ? "s" : ""}
						</p>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2, 3, 4, 5].map((n) => (
						<div
							key={n}
							className="h-[72px] animate-pulse rounded-xl bg-muted"
						/>
					))}
				</div>
			) : orders.length === 0 ? (
				<div className="rounded-xl border border-border bg-muted/30 py-16 text-center">
					<div className="mb-4 flex justify-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-muted-foreground"
								aria-hidden="true"
							>
								<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
								<path d="M3 6h18" />
								<path d="M16 10a4 4 0 0 1-8 0" />
							</svg>
						</div>
					</div>
					<p className="font-medium text-foreground text-sm">No orders yet</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Your order history will appear here after your first purchase.
					</p>
					<a
						href="/products"
						className="mt-4 inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2 font-semibold text-background text-sm transition-opacity hover:opacity-90"
					>
						Browse products
					</a>
				</div>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-hidden rounded-xl border border-border sm:block">
						<table className="w-full">
							<thead>
								<tr className="border-border border-b bg-muted/40">
									<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">
										Order
									</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">
										Date
									</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">
										Status
									</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">
										Payment
									</th>
									<th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">
										Total
									</th>
									<th className="w-10 px-4 py-3" />
								</tr>
							</thead>
							<tbody>
								{orders.map((order) => (
									<tr
										key={order.id}
										className="border-border border-b transition-colors last:border-0 hover:bg-muted/30"
									>
										<td className="px-4 py-3.5">
											<a
												href={`/account/orders/${order.id}`}
												className="font-medium text-foreground text-sm hover:underline"
											>
												{order.orderNumber}
											</a>
										</td>
										<td className="px-4 py-3.5 text-muted-foreground text-sm">
											{formatDate(order.createdAt)}
										</td>
										<td className="px-4 py-3.5">
											<StatusBadge
												value={order.status}
												styles={STATUS_STYLES}
											/>
										</td>
										<td className="px-4 py-3.5">
											<StatusBadge
												value={order.paymentStatus}
												styles={PAYMENT_STYLES}
											/>
										</td>
										<td className="px-4 py-3.5 text-right font-medium text-foreground text-sm tabular-nums">
											{formatPrice(order.total, order.currency)}
										</td>
										<td className="px-4 py-3.5">
											<a
												href={`/account/orders/${order.id}`}
												className="text-muted-foreground transition-colors hover:text-foreground"
											>
												<span className="sr-only">
													View order {order.orderNumber}
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
													aria-hidden="true"
												>
													<path d="m9 18 6-6-6-6" />
												</svg>
											</a>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile list */}
					<div className="overflow-hidden rounded-xl border border-border sm:hidden">
						{orders.map((order) => (
							<a
								key={order.id}
								href={`/account/orders/${order.id}`}
								className="flex items-center justify-between gap-3 border-border border-b px-4 py-4 transition-colors last:border-0 hover:bg-muted/40"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-foreground text-sm">
											{order.orderNumber}
										</span>
										<StatusBadge value={order.status} styles={STATUS_STYLES} />
									</div>
									<p className="mt-0.5 text-muted-foreground text-xs">
										{formatDate(order.createdAt)}
									</p>
								</div>
								<span className="shrink-0 font-medium text-foreground text-sm tabular-nums">
									{formatPrice(order.total, order.currency)}
								</span>
							</a>
						))}
					</div>

					{/* Pagination */}
					{pages > 1 && (
						<div className="mt-6 flex items-center justify-center gap-2">
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
		</div>
	);
}
