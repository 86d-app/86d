"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import LoyaltyOverviewTemplate from "./loyalty-overview.mdx";

interface LoyaltyAccount {
	id: string;
	customerId: string;
	balance: number;
	lifetimeEarned: number;
	lifetimeRedeemed: number;
	tier: "bronze" | "silver" | "gold" | "platinum";
	status: "active" | "suspended" | "closed";
	createdAt: string;
	updatedAt: string;
}

interface LoyaltySummary {
	totalAccounts: number;
	totalPointsOutstanding: number;
	totalLifetimeEarned: number;
	tierBreakdown: Array<{ tier: string; count: number }>;
}

type TierFilter = "all" | "bronze" | "silver" | "gold" | "platinum";
type StatusFilter = "all" | "active" | "suspended" | "closed";

const TIER_FILTERS: { label: string; value: TierFilter }[] = [
	{ label: "All Tiers", value: "all" },
	{ label: "Bronze", value: "bronze" },
	{ label: "Silver", value: "silver" },
	{ label: "Gold", value: "gold" },
	{ label: "Platinum", value: "platinum" },
];

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "Active", value: "active" },
	{ label: "Suspended", value: "suspended" },
	{ label: "Closed", value: "closed" },
];

const TIER_COLORS: Record<string, string> = {
	bronze:
		"bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
	silver: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
	gold: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
	platinum:
		"bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

const PAGE_SIZE = 25;

function formatNumber(n: number): string {
	return new Intl.NumberFormat("en-US").format(n);
}

function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded bg-muted ${className}`}
			aria-hidden="true"
		/>
	);
}

function TierBadge({ tier }: { tier: string }) {
	return (
		<span
			className={`inline-block rounded-full px-2 py-0.5 font-medium text-xs capitalize ${TIER_COLORS[tier] ?? "bg-muted text-muted-foreground"}`}
		>
			{tier}
		</span>
	);
}

function StatusBadge({ status }: { status: LoyaltyAccount["status"] }) {
	const styles: Record<LoyaltyAccount["status"], string> = {
		active:
			"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
		suspended:
			"bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
		closed: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
	};

	return (
		<span
			className={`inline-block rounded-full px-2 py-0.5 font-medium text-xs capitalize ${styles[status]}`}
		>
			{status}
		</span>
	);
}

function useLoyaltyApi() {
	const client = useModuleClient();
	return {
		listAccounts: client.module("loyalty").admin["/admin/loyalty/accounts"],
		summary: client.module("loyalty").admin["/admin/loyalty/summary"],
	};
}

export function LoyaltyOverview() {
	const api = useLoyaltyApi();
	const [tierFilter, setTierFilter] = useState<TierFilter>("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [skip, setSkip] = useState(0);

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
		skip: String(skip),
	};
	if (tierFilter !== "all") queryInput.tier = tierFilter;
	if (statusFilter !== "all") queryInput.status = statusFilter;

	const { data: accountsData, isLoading: accountsLoading } =
		api.listAccounts.useQuery(queryInput) as {
			data: { accounts: LoyaltyAccount[]; total: number } | undefined;
			isLoading: boolean;
		};

	const { data: summaryData, isLoading: summaryLoading } = api.summary.useQuery(
		{},
	) as {
		data: LoyaltySummary | undefined;
		isLoading: boolean;
	};

	const accounts = accountsData?.accounts ?? [];
	const summary = summaryData ?? null;

	const handleTierChange = (filter: TierFilter) => {
		setTierFilter(filter);
		setSkip(0);
	};

	const handleStatusChange = (filter: StatusFilter) => {
		setStatusFilter(filter);
		setSkip(0);
	};

	const hasPrev = skip > 0;
	const hasNext = accounts.length === PAGE_SIZE;

	const summaryCards = summaryLoading ? (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="rounded-lg border border-border bg-card p-4">
					<Skeleton className="mb-2 h-3 w-2/3" />
					<Skeleton className="h-7 w-1/2" />
				</div>
			))}
		</div>
	) : summary ? (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div className="rounded-lg border border-border bg-card p-4">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Total Members
				</p>
				<p className="mt-1 font-semibold text-2xl text-foreground">
					{formatNumber(summary.totalAccounts)}
				</p>
			</div>
			<div className="rounded-lg border border-border bg-card p-4">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Points Outstanding
				</p>
				<p className="mt-1 font-semibold text-2xl text-foreground">
					{formatNumber(summary.totalPointsOutstanding)}
				</p>
			</div>
			<div className="rounded-lg border border-border bg-card p-4">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Lifetime Earned
				</p>
				<p className="mt-1 font-semibold text-2xl text-emerald-600 dark:text-emerald-400">
					{formatNumber(summary.totalLifetimeEarned)}
				</p>
			</div>
			<div className="rounded-lg border border-border bg-card p-4">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Tier Breakdown
				</p>
				<div className="mt-1 flex flex-wrap gap-1.5">
					{summary.tierBreakdown.map((tb) => (
						<span key={tb.tier} className="text-foreground text-sm">
							<TierBadge tier={tb.tier} />{" "}
							<span className="text-muted-foreground">{tb.count}</span>
						</span>
					))}
					{summary.tierBreakdown.length === 0 && (
						<span className="text-muted-foreground text-sm">No members</span>
					)}
				</div>
			</div>
		</div>
	) : null;

	const tableBody =
		accountsLoading && accounts.length === 0 ? (
			<>
				{Array.from({ length: 5 }, (_, i) => (
					<tr key={`sk-${i}`}>
						{Array.from({ length: 6 }, (_, j) => (
							<td key={`sk-cell-${j}`} className="px-4 py-3">
								<Skeleton className="h-4" />
							</td>
						))}
					</tr>
				))}
			</>
		) : accounts.length === 0 ? (
			<tr>
				<td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
					No loyalty accounts found.
				</td>
			</tr>
		) : (
			accounts.map((account) => (
				<tr
					key={account.id}
					className="border-border border-b last:border-0 hover:bg-muted/20"
				>
					<td className="px-4 py-3">
						<code className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
							{account.customerId}
						</code>
					</td>
					<td className="px-4 py-3 font-medium text-foreground">
						{formatNumber(account.balance)}
					</td>
					<td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
						{formatNumber(account.lifetimeEarned)}
					</td>
					<td className="px-4 py-3">
						<TierBadge tier={account.tier} />
					</td>
					<td className="px-4 py-3">
						<StatusBadge status={account.status} />
					</td>
					<td className="px-4 py-3 text-right">
						<a
							href={`/admin/loyalty/accounts/${account.customerId}`}
							className="rounded px-2 py-1 font-medium text-foreground text-xs hover:bg-muted"
						>
							Manage
						</a>
					</td>
				</tr>
			))
		);

	return (
		<LoyaltyOverviewTemplate
			summaryCards={summaryCards}
			tierFilters={TIER_FILTERS}
			tierFilter={tierFilter}
			onTierChange={handleTierChange}
			statusFilters={STATUS_FILTERS}
			statusFilter={statusFilter}
			onStatusChange={handleStatusChange}
			tableBody={tableBody}
			hasPrev={hasPrev}
			hasNext={hasNext}
			loading={accountsLoading}
			onPrevPage={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
			onNextPage={() => setSkip((s) => s + PAGE_SIZE)}
		/>
	);
}
