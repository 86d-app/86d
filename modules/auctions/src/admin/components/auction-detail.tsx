"use client";

import { useModuleClient } from "@86d-app/core/client";
import AuctionDetailTemplate from "./auction-detail.mdx";

interface AuctionData {
	id: string;
	title: string;
	productName: string;
	type: string;
	status: string;
	startingPrice: number;
	currentBid: number;
	reservePrice: number;
	buyNowPrice: number;
	bidCount: number;
	startsAt: string;
	endsAt: string;
}

interface BidData {
	id: string;
	customerId: string;
	customerName?: string;
	amount: number;
	isWinning: boolean;
	createdAt: string;
}

function useAuctionDetailApi() {
	const client = useModuleClient();
	return {
		detail: client.module("auctions").admin["/admin/auctions/:id"],
	};
}

export function AuctionDetail({ auctionId }: { auctionId: string }) {
	const api = useAuctionDetailApi();

	const { data, isLoading: loading } = api.detail.useQuery({
		id: auctionId,
	}) as {
		data:
			| {
					auction: AuctionData;
					recentBids: BidData[];
					watcherCount: number;
			  }
			| undefined;
		isLoading: boolean;
	};

	return (
		<AuctionDetailTemplate
			auction={data?.auction}
			recentBids={data?.recentBids ?? []}
			watcherCount={data?.watcherCount ?? 0}
			loading={loading}
		/>
	);
}
