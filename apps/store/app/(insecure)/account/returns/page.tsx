"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface ReturnItemData {
	id: string;
	returnRequestId: string;
	orderItemId: string;
	quantity: number;
	reason?: string | null;
}

interface ReturnWithOrder {
	id: string;
	orderId: string;
	orderNumber: string;
	status: string;
	type: string;
	reason: string;
	customerNotes?: string | null;
	adminNotes?: string | null;
	refundAmount?: number | null;
	trackingNumber?: string | null;
	trackingUrl?: string | null;
	carrier?: string | null;
	createdAt: string;
	items: ReturnItemData[];
}

interface ReturnsListResponse {
	returns: ReturnWithOrder[];
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

const RETURN_STATUS_STYLES: Record<string, string> = {
	requested:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	approved: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	rejected: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
	shipped_back:
		"bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
	received:
		"bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
	refunded:
		"bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	completed: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
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

const STATUS_FILTERS = [
	{ label: "All", value: "" },
	{ label: "Requested", value: "requested" },
	{ label: "Approved", value: "approved" },
	{ label: "Shipped back", value: "shipped_back" },
	{ label: "Received", value: "received" },
	{ label: "Refunded", value: "refunded" },
	{ label: "Completed", value: "completed" },
	{ label: "Rejected", value: "rejected" },
] as const;

const RETURN_STATUS_STEPS = [
	"requested",
	"approved",
	"shipped_back",
	"received",
	"refunded",
	"completed",
] as const;

function ReturnTimeline({ status }: { status: string }) {
	const currentIdx = RETURN_STATUS_STEPS.indexOf(
		status as (typeof RETURN_STATUS_STEPS)[number],
	);

	if (status === "rejected") {
		return (
			<div className="flex items-center gap-1.5">
				<div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						className="text-red-600 dark:text-red-400"
						aria-hidden="true"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</div>
				<span className="font-medium text-red-600 text-xs dark:text-red-400">
					Return rejected
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-0.5">
			{RETURN_STATUS_STEPS.map((step, idx) => (
				<div key={step} className="flex items-center gap-0.5">
					<div
						className={`h-1.5 rounded-full transition-colors ${
							idx <= currentIdx
								? "w-4 bg-foreground"
								: "w-4 bg-muted-foreground/20"
						}`}
					/>
				</div>
			))}
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
	const client = useModuleClient();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState("");

	const returnsApi = client.module("orders").store["/orders/me/returns"];

	const queryInput: Record<string, string> = {
		page: String(page),
		limit: "10",
	};
	if (statusFilter) {
		queryInput.status = statusFilter;
	}

	const { data, isLoading } = returnsApi.useQuery(queryInput) as {
		data: ReturnsListResponse | undefined;
		isLoading: boolean;
	};

	const returns = data?.returns ?? [];
	const pages = data?.pages ?? 1;
	const total = data?.total ?? 0;

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<h2 className="font-bold font-display text-foreground text-xl tracking-tight sm:text-2xl">
					Returns
				</h2>
				{total > 0 && (
					<p className="mt-1 text-muted-foreground text-sm">
						{total} return request{total !== 1 ? "s" : ""}
					</p>
				)}
			</div>

			{/* Status filter */}
			<div className="scrollbar-none -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1">
				{STATUS_FILTERS.map((f) => (
					<button
						key={f.value}
						type="button"
						onClick={() => {
							setStatusFilter(f.value);
							setPage(1);
						}}
						className={`shrink-0 rounded-full border px-3 py-1.5 font-medium text-xs transition-colors ${
							statusFilter === f.value
								? "border-foreground bg-foreground text-background"
								: "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
						}`}
					>
						{f.label}
					</button>
				))}
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />
					))}
				</div>
			) : returns.length === 0 ? (
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
								<path d="M9 14 4 9l5-5" />
								<path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
							</svg>
						</div>
					</div>
					<p className="font-medium text-foreground text-sm">
						{statusFilter ? "No matching returns" : "No returns yet"}
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{statusFilter
							? "Try adjusting your filter."
							: "Return requests will appear here when you submit them."}
					</p>
					<a
						href="/account/orders"
						className="mt-4 inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2 font-semibold text-background text-sm transition-opacity hover:opacity-90"
					>
						View orders
					</a>
				</div>
			) : (
				<>
					{/* Returns list */}
					<div className="space-y-3">
						{returns.map((r) => (
							<a
								key={r.id}
								href={`/account/orders/${r.orderId}`}
								className="block rounded-xl border border-border p-4 transition-colors hover:bg-muted/30"
							>
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<StatusBadge
												value={r.status}
												styles={RETURN_STATUS_STYLES}
											/>
											<span className="text-muted-foreground text-xs capitalize">
												{r.type.replace(/_/g, " ")}
											</span>
										</div>
										<p className="mt-1.5 font-medium text-foreground text-sm">
											Order{" "}
											<span className="font-semibold">{r.orderNumber}</span>
										</p>
										<p className="mt-0.5 text-muted-foreground text-sm capitalize">
											Reason: {r.reason.replace(/_/g, " ")}
										</p>
									</div>
									<div className="shrink-0 text-right">
										{r.refundAmount != null && (
											<p className="font-medium text-emerald-600 text-sm dark:text-emerald-400">
												{formatPrice(r.refundAmount)}
											</p>
										)}
										<p className="text-muted-foreground text-xs">
											{formatDate(r.createdAt)}
										</p>
									</div>
								</div>

								{/* Timeline */}
								<div className="mt-3">
									<ReturnTimeline status={r.status} />
								</div>

								{/* Admin response */}
								{r.adminNotes && (
									<div className="mt-3 rounded-lg bg-muted/40 p-2.5">
										<p className="mb-0.5 text-muted-foreground text-xs">
											Store response
										</p>
										<p className="text-foreground text-sm">{r.adminNotes}</p>
									</div>
								)}

								{/* Tracking info */}
								{r.trackingNumber && (
									<div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
											<path d="M3 6h18" />
											<path d="M16 10a4 4 0 0 1-8 0" />
										</svg>
										<span className="font-mono">
											{r.carrier && `${r.carrier}: `}
											{r.trackingNumber}
										</span>
									</div>
								)}

								{/* Items count */}
								{r.items.length > 0 && (
									<p className="mt-2 text-muted-foreground text-xs">
										{r.items.length} item{r.items.length !== 1 ? "s" : ""}
									</p>
								)}
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
