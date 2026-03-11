"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

interface Quote {
	id: string;
	quoteNumber?: string;
	customerId?: string;
	customerEmail: string;
	customerName?: string;
	companyName?: string;
	status: string;
	notes?: string;
	adminNotes?: string;
	subtotal?: number;
	discount?: number;
	total: number;
	currency: string;
	itemCount?: number;
	expiresAt?: string;
	convertedOrderId?: string;
	createdAt: string;
	updatedAt?: string;
}

interface QuoteItem {
	id: string;
	productName?: string;
	sku?: string;
	quantity: number;
	unitPrice: number;
	offeredPrice?: number;
	notes?: string;
}

interface QuoteComment {
	id: string;
	authorType: "customer" | "admin";
	authorName?: string;
	message: string;
	createdAt: string;
}

interface QuoteHistory {
	id: string;
	fromStatus?: string;
	toStatus: string;
	changedBy?: string;
	reason?: string;
	createdAt: string;
}

function useQuotesApi() {
	const client = useModuleClient();
	return {
		list: client.module("quotes").admin["/admin/quotes"],
		detail: client.module("quotes").admin["/admin/quotes/:id"],
		approve: client.module("quotes").admin["/admin/quotes/:id/approve"],
		reject: client.module("quotes").admin["/admin/quotes/:id/reject"],
		convert: client.module("quotes").admin["/admin/quotes/:id/convert"],
		expire: client.module("quotes").admin["/admin/quotes/:id/expire"],
		addComment: client.module("quotes").admin["/admin/quotes/:id/comments/add"],
	};
}

function formatCurrency(cents: number, currency = "USD"): string {
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
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(iso));
}

const STATUS_COLORS: Record<string, string> = {
	draft: "bg-muted text-muted-foreground",
	submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	under_review:
		"bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
	countered:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
	accepted:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	expired:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	converted:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
	sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function QuoteList() {
	const api = useQuotesApi();
	const { data, isLoading } = api.list.useQuery({}) as {
		data: { quotes?: Quote[] } | undefined;
		isLoading: boolean;
	};

	const quotes = data?.quotes ?? [];

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Quotes</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage price quotes and proposals for customers
					</p>
				</div>
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
			) : quotes.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No quotes created yet. Create quotes to send custom pricing
						proposals to customers.
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b text-left">
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Quote
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Customer
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Total
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{quotes.map((quote) => (
								<tr key={quote.id} className="hover:bg-muted/50">
									<td className="px-4 py-3">
										<a
											href={`/admin/quotes/${quote.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											#{quote.quoteNumber}
										</a>
										<p className="text-muted-foreground text-xs">
											{quote.itemCount} item
											{quote.itemCount !== 1 ? "s" : ""}
										</p>
									</td>
									<td className="px-4 py-3">
										<p className="text-foreground text-sm">
											{quote.customerName ?? quote.customerEmail}
										</p>
									</td>
									<td className="px-4 py-3 font-medium text-foreground text-sm">
										{formatCurrency(quote.total, quote.currency)}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[quote.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{quote.status}
										</span>
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

export function QuoteDetail({ params }: { params?: Record<string, string> }) {
	const id = params?.id ?? "";
	const api = useQuotesApi();
	const [comment, setComment] = useState("");

	const { data, isLoading } = api.detail.useQuery({ id }) as {
		data:
			| {
					quote?: Quote;
					items?: QuoteItem[];
					comments?: QuoteComment[];
					history?: QuoteHistory[];
			  }
			| undefined;
		isLoading: boolean;
	};

	const quote = data?.quote;
	const items = data?.items ?? [];
	const comments = data?.comments ?? [];
	const history = data?.history ?? [];

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/quotes"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Quotes
					</a>
				</div>
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-32 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			</div>
		);
	}

	if (!quote) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/quotes"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Quotes
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">Quote not found.</p>
				</div>
			</div>
		);
	}

	const canApprove = ["submitted", "under_review"].includes(quote.status);
	const canReject = ["submitted", "under_review", "countered"].includes(
		quote.status,
	);
	const canConvert = quote.status === "accepted";

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/quotes"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Quotes
				</a>
			</div>

			{/* Header */}
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="font-bold text-2xl text-foreground">
							Quote {quote.quoteNumber ? `#${quote.quoteNumber}` : ""}
						</h1>
						<span
							className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs capitalize ${STATUS_COLORS[quote.status] ?? "bg-muted text-muted-foreground"}`}
						>
							{quote.status.replace(/_/g, " ")}
						</span>
					</div>
					<p className="mt-1 text-muted-foreground text-sm">
						Created {formatDate(quote.createdAt)}
						{quote.expiresAt ? ` · Expires ${formatDate(quote.expiresAt)}` : ""}
					</p>
				</div>
				<div className="flex gap-2">
					{canApprove ? (
						<button
							type="button"
							className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-green-700"
						>
							Approve
						</button>
					) : null}
					{canConvert ? (
						<button
							type="button"
							className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm hover:opacity-90"
						>
							Convert to Order
						</button>
					) : null}
					{canReject ? (
						<button
							type="button"
							className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-muted"
						>
							Reject
						</button>
					) : null}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column */}
				<div className="space-y-6 lg:col-span-2">
					{/* Items table */}
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Items ({items.length})
							</h2>
						</div>
						{items.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No items in this quote.
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="border-border border-b text-left">
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Product
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Qty
										</th>
										<th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
											Unit Price
										</th>
										<th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">
											Offered
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{items.map((item) => (
										<tr key={item.id}>
											<td className="px-4 py-2.5">
												<p className="font-medium text-foreground text-sm">
													{item.productName ?? "Product"}
												</p>
												{item.sku ? (
													<p className="text-muted-foreground text-xs">
														SKU: {item.sku}
													</p>
												) : null}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm">
												{item.quantity}
											</td>
											<td className="px-4 py-2.5 text-right text-muted-foreground text-sm tabular-nums">
												{formatCurrency(item.unitPrice, quote.currency)}
											</td>
											<td className="px-4 py-2.5 text-right font-medium text-foreground text-sm tabular-nums">
												{formatCurrency(
													item.offeredPrice ?? item.unitPrice,
													quote.currency,
												)}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="border-border border-t">
									{quote.discount ? (
										<tr>
											<td
												colSpan={3}
												className="px-4 py-2 text-right text-muted-foreground text-sm"
											>
												Discount
											</td>
											<td className="px-4 py-2 text-right text-green-600 text-sm tabular-nums">
												-{formatCurrency(quote.discount, quote.currency)}
											</td>
										</tr>
									) : null}
									<tr>
										<td
											colSpan={3}
											className="px-4 py-2 text-right font-semibold text-foreground text-sm"
										>
											Total
										</td>
										<td className="px-4 py-2 text-right font-semibold text-foreground text-sm tabular-nums">
											{formatCurrency(quote.total, quote.currency)}
										</td>
									</tr>
								</tfoot>
							</table>
						)}
					</div>

					{/* Comments */}
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Comments
							</h2>
						</div>
						<div className="divide-y divide-border">
							{comments.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground text-sm">
									No comments yet.
								</div>
							) : (
								comments.map((c) => (
									<div key={c.id} className="px-4 py-3">
										<div className="flex items-center gap-2">
											<span
												className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium text-xs ${
													c.authorType === "admin"
														? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
														: "bg-muted text-muted-foreground"
												}`}
											>
												{c.authorType}
											</span>
											<span className="font-medium text-foreground text-sm">
												{c.authorName ?? "Unknown"}
											</span>
											<span className="text-muted-foreground text-xs">
												{formatDate(c.createdAt)}
											</span>
										</div>
										<p className="mt-1 text-foreground text-sm">{c.message}</p>
									</div>
								))
							)}
						</div>
						<div className="border-border border-t p-4">
							<div className="flex gap-2">
								<input
									type="text"
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									placeholder="Add a comment..."
									className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								<button
									type="button"
									disabled={!comment.trim()}
									className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
								>
									Send
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Right column - sidebar */}
				<div className="space-y-6">
					{/* Customer info */}
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Customer
						</h3>
						<dl className="space-y-2 text-sm">
							{quote.customerName ? (
								<div>
									<dt className="text-muted-foreground">Name</dt>
									<dd className="font-medium text-foreground">
										{quote.customerName}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Email</dt>
								<dd className="font-medium text-foreground">
									{quote.customerEmail}
								</dd>
							</div>
							{quote.companyName ? (
								<div>
									<dt className="text-muted-foreground">Company</dt>
									<dd className="font-medium text-foreground">
										{quote.companyName}
									</dd>
								</div>
							) : null}
						</dl>
					</div>

					{/* Notes */}
					{quote.notes || quote.adminNotes ? (
						<div className="rounded-lg border border-border bg-card p-4">
							<h3 className="mb-3 font-semibold text-foreground text-sm">
								Notes
							</h3>
							{quote.notes ? (
								<div className="mb-2">
									<p className="mb-1 text-muted-foreground text-xs">
										Customer note
									</p>
									<p className="text-foreground text-sm">{quote.notes}</p>
								</div>
							) : null}
							{quote.adminNotes ? (
								<div>
									<p className="mb-1 text-muted-foreground text-xs">
										Admin note
									</p>
									<p className="text-foreground text-sm">{quote.adminNotes}</p>
								</div>
							) : null}
						</div>
					) : null}

					{/* History timeline */}
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							History
						</h3>
						{history.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No status changes recorded.
							</p>
						) : (
							<div className="space-y-3">
								{history.map((h) => (
									<div key={h.id} className="flex gap-3">
										<div className="flex flex-col items-center">
											<div className="h-2 w-2 rounded-full bg-muted-foreground" />
											<div className="w-px flex-1 bg-border" />
										</div>
										<div className="pb-3">
											<p className="text-foreground text-sm">
												{h.fromStatus ? (
													<>
														<span className="capitalize">
															{h.fromStatus.replace(/_/g, " ")}
														</span>
														{" → "}
													</>
												) : null}
												<span className="font-medium capitalize">
													{h.toStatus.replace(/_/g, " ")}
												</span>
											</p>
											{h.reason ? (
												<p className="text-muted-foreground text-xs">
													{h.reason}
												</p>
											) : null}
											<p className="text-muted-foreground text-xs">
												{formatDate(h.createdAt)}
												{h.changedBy ? ` · ${h.changedBy}` : ""}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
