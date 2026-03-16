"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import UberDirectAdminTemplate from "./uber-direct-admin.mdx";

interface DeliveryItem {
	id: string;
	orderId: string;
	status: string;
	fee: number;
	tip: number;
	courierName?: string;
	trackingUrl?: string;
	createdAt: string;
}

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	"picked-up":
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
	delivered:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
	failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function useUberDirectAdminApi() {
	const client = useModuleClient();
	return {
		list: client.module("uber-direct").admin["/admin/uber-direct/deliveries"],
		updateStatus:
			client.module("uber-direct").admin[
				"/admin/uber-direct/deliveries/:id/status"
			],
		quotes: client.module("uber-direct").admin["/admin/uber-direct/quotes"],
		stats: client.module("uber-direct").admin["/admin/uber-direct/stats"],
	};
}

export function UberDirectAdmin() {
	const api = useUberDirectAdminApi();
	const [skip, setSkip] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");
	const [error] = useState("");

	const { data: listData, isLoading } = api.list.useQuery({
		take: String(PAGE_SIZE),
		skip: String(skip),
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { deliveries: DeliveryItem[]; total: number } | undefined;
		isLoading: boolean;
	};

	const deliveries = listData?.deliveries ?? [];
	const total = listData?.total ?? 0;

	const tableContent =
		deliveries.length === 0 ? (
			<div className="px-5 py-8 text-center text-muted-foreground text-sm">
				No deliveries found.
			</div>
		) : (
			<>
				<div className="hidden md:block">
					<table className="w-full text-left text-sm">
						<thead className="border-border border-b bg-muted/50">
							<tr>
								<th className="px-5 py-2.5 font-medium text-muted-foreground">
									Order
								</th>
								<th className="px-5 py-2.5 font-medium text-muted-foreground">
									Status
								</th>
								<th className="px-5 py-2.5 font-medium text-muted-foreground">
									Fee
								</th>
								<th className="px-5 py-2.5 font-medium text-muted-foreground">
									Courier
								</th>
								<th className="px-5 py-2.5 font-medium text-muted-foreground">
									Created
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{deliveries.map((d) => (
								<tr key={d.id} className="hover:bg-muted/30">
									<td className="px-5 py-3 font-mono text-foreground text-xs">
										{d.orderId}
									</td>
									<td className="px-5 py-3">
										<span
											className={`rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[d.status] ?? ""}`}
										>
											{d.status}
										</span>
									</td>
									<td className="px-5 py-3 text-foreground">
										{formatCurrency(d.fee)}
									</td>
									<td className="px-5 py-3 text-muted-foreground text-sm">
										{d.courierName ?? "--"}
									</td>
									<td className="px-5 py-3 text-muted-foreground">
										{formatDate(d.createdAt)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="divide-y divide-border md:hidden">
					{deliveries.map((d) => (
						<div key={d.id} className="px-5 py-3">
							<div className="flex items-start justify-between">
								<div>
									<p className="font-medium font-mono text-foreground text-sm">
										{d.orderId}
									</p>
									<p className="mt-0.5 text-muted-foreground text-sm">
										{formatCurrency(d.fee)}
									</p>
								</div>
								<span
									className={`rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[d.status] ?? ""}`}
								>
									{d.status}
								</span>
							</div>
						</div>
					))}
				</div>

				{total > PAGE_SIZE && (
					<div className="flex items-center justify-between border-border border-t px-5 py-3">
						<span className="text-muted-foreground text-sm">
							Showing {skip + 1}--{Math.min(skip + PAGE_SIZE, total)} of {total}
						</span>
						<span className="space-x-2">
							<button
								type="button"
								onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
								disabled={skip === 0}
								className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
							>
								Previous
							</button>
							<button
								type="button"
								onClick={() => setSkip((s) => s + PAGE_SIZE)}
								disabled={skip + PAGE_SIZE >= total}
								className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
							>
								Next
							</button>
						</span>
					</div>
				)}
			</>
		);

	return (
		<UberDirectAdminTemplate
			statusFilter={statusFilter}
			onStatusFilterChange={(v: string) => {
				setStatusFilter(v);
				setSkip(0);
			}}
			error={error}
			loading={isLoading}
			tableContent={tableContent}
		/>
	);
}
