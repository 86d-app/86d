"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface ReviewData {
	id: string;
	productId: string;
	rating: number;
	title?: string | undefined;
	body: string;
	status: "pending" | "approved" | "rejected";
	isVerifiedPurchase: boolean;
	helpfulCount: number;
	merchantResponse?: string | undefined;
	merchantResponseAt?: string | undefined;
	moderationNote?: string | undefined;
	createdAt: string;
	updatedAt: string;
}

interface ReviewsListResponse {
	reviews: ReviewData[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
	approved: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
	rejected: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const STATUS_FILTERS = [
	{ label: "All", value: "" },
	{ label: "Pending", value: "pending" },
	{ label: "Approved", value: "approved" },
	{ label: "Rejected", value: "rejected" },
] as const;

function StatusBadge({ status }: { status: string }) {
	const colorClass =
		STATUS_STYLES[status] ??
		"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
	return (
		<span
			className={`inline-block rounded-full px-2 py-0.5 font-medium text-xs capitalize ${colorClass}`}
		>
			{status}
		</span>
	);
}

function StarRating({ rating }: { rating: number }) {
	return (
		<div
			className="flex items-center gap-0.5"
			role="img"
			aria-label={`${rating} out of 5 stars`}
		>
			{[1, 2, 3, 4, 5].map((star) => (
				<svg
					key={star}
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill={star <= rating ? "currentColor" : "none"}
					stroke="currentColor"
					strokeWidth="1.5"
					className={
						star <= rating ? "text-amber-500" : "text-muted-foreground/30"
					}
					aria-hidden="true"
				>
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			))}
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MyReviewsPage() {
	const client = useModuleClient();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState("");

	const reviewsApi = client.module("reviews").store["/reviews/me"];

	const queryInput: Record<string, string> = {
		page: String(page),
		limit: "10",
	};
	if (statusFilter) {
		queryInput.status = statusFilter;
	}

	const { data, isLoading } = reviewsApi.useQuery(queryInput) as {
		data: ReviewsListResponse | undefined;
		isLoading: boolean;
	};

	const reviews = data?.reviews ?? [];
	const pages = data?.pages ?? 1;
	const total = data?.total ?? 0;

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<h2 className="font-bold font-display text-foreground text-xl tracking-tight sm:text-2xl">
					My Reviews
				</h2>
				{total > 0 && (
					<p className="mt-1 text-muted-foreground text-sm">
						{total} review{total !== 1 ? "s" : ""} submitted
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
			) : reviews.length === 0 ? (
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
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
							</svg>
						</div>
					</div>
					<p className="font-medium text-foreground text-sm">
						{statusFilter ? "No matching reviews" : "No reviews yet"}
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{statusFilter
							? "Try adjusting your filter."
							: "Share your thoughts on products you've purchased."}
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
					<div className="space-y-3">
						{reviews.map((review) => (
							<div
								key={review.id}
								className="rounded-xl border border-border p-4"
							>
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<StarRating rating={review.rating} />
											<StatusBadge status={review.status} />
											{review.isVerifiedPurchase && (
												<span className="inline-flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400">
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
														<path d="M20 6 9 17l-5-5" />
													</svg>
													Verified
												</span>
											)}
										</div>
										{review.title && (
											<p className="mt-2 font-semibold text-foreground text-sm">
												{review.title}
											</p>
										)}
										<p className="mt-1 text-foreground/80 text-sm leading-relaxed">
											{review.body}
										</p>
									</div>
									<div className="shrink-0 text-right">
										<p className="text-muted-foreground text-xs">
											{formatDate(review.createdAt)}
										</p>
										{review.helpfulCount > 0 && (
											<p className="mt-1 text-muted-foreground text-xs">
												{review.helpfulCount} found helpful
											</p>
										)}
									</div>
								</div>

								{/* Merchant response */}
								{review.merchantResponse && (
									<div className="mt-3 rounded-lg bg-muted/40 p-3">
										<p className="mb-1 text-muted-foreground text-xs">
											Store response
										</p>
										<p className="text-foreground text-sm">
											{review.merchantResponse}
										</p>
										{review.merchantResponseAt && (
											<p className="mt-1 text-muted-foreground text-xs">
												{formatDate(review.merchantResponseAt)}
											</p>
										)}
									</div>
								)}

								{/* Rejection note */}
								{review.status === "rejected" && review.moderationNote && (
									<div className="mt-3 rounded-lg bg-red-50/50 p-3 dark:bg-red-950/20">
										<p className="mb-1 text-red-600 text-xs dark:text-red-400">
											Moderation note
										</p>
										<p className="text-foreground text-sm">
											{review.moderationNote}
										</p>
									</div>
								)}

								{/* Product link */}
								<div className="mt-3 border-border border-t pt-2">
									<a
										href={`/products/${review.productId}`}
										className="text-muted-foreground text-xs transition-colors hover:text-foreground"
									>
										View product →
									</a>
								</div>
							</div>
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
