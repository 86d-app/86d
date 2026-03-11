"use client";

import { useModuleClient } from "@86d-app/core/client";

interface Quote {
	id: string;
	quoteNumber: string;
	customerEmail: string;
	customerName?: string;
	status: "draft" | "sent" | "accepted" | "rejected" | "expired";
	total: number;
	currency: string;
	itemCount: number;
	expiresAt?: string;
	createdAt: string;
}

function useQuotesApi() {
	const client = useModuleClient();
	return {
		list: client.module("quotes").admin["/admin/quotes"],
	};
}

function formatCurrency(cents: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

const STATUS_COLORS: Record<string, string> = {
	draft: "bg-muted text-muted-foreground",
	sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	accepted:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	expired:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
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

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/quotes"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Quotes
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					Quote Detail
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Quote ID: {id || "Unknown"}
				</p>
			</div>

			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">
					Quote detail view is under development.
				</p>
			</div>
		</div>
	);
}
