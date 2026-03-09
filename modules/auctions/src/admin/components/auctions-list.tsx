"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import AuctionsListTemplate from "./auctions-list.mdx";

interface AuctionListItem {
	id: string;
	title: string;
	productName: string;
	type: string;
	status: string;
	currentBid: number;
	bidCount: number;
	startsAt: string;
	endsAt: string;
}

interface SummaryData {
	totalAuctions: number;
	active: number;
	scheduled: number;
	sold: number;
	totalBids: number;
	totalRevenue: number;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	ended:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	sold: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function useAuctionsApi() {
	const client = useModuleClient();
	return {
		list: client.module("auctions").admin["/admin/auctions"],
		summary: client.module("auctions").admin["/admin/auctions/summary"],
	};
}

export function AuctionsList() {
	const api = useAuctionsApi();
	const [statusFilter, setStatusFilter] = useState("");

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
	};
	if (statusFilter) queryInput.status = statusFilter;

	const { data: listData, isLoading: loading } = api.list.useQuery(
		queryInput,
	) as {
		data: { auctions: AuctionListItem[] } | undefined;
		isLoading: boolean;
	};

	const { data: summaryData } = api.summary.useQuery({}) as {
		data: { summary: SummaryData } | undefined;
	};

	const auctionsList = listData?.auctions ?? [];
	const summary = summaryData?.summary;

	return (
		<AuctionsListTemplate
			auctions={auctionsList}
			summary={summary}
			loading={loading}
			statusFilter={statusFilter}
			onStatusChange={setStatusFilter}
			statusColors={STATUS_COLORS}
		/>
	);
}
