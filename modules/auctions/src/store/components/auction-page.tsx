"use client";

import { useModuleClient } from "@86d-app/core/client";
import AuctionPageTemplate from "./auction-page.mdx";

interface AuctionData {
	id: string;
	title: string;
	description?: string;
	productName: string;
	imageUrl?: string;
	type: string;
	status: string;
	startingPrice: number;
	currentBid: number;
	bidCount: number;
	buyNowPrice: number;
	endsAt: string;
}

interface BidItem {
	id: string;
	amount: number;
	customerName?: string;
	isWinning: boolean;
	createdAt: string;
}

function useAuctionPageApi() {
	const client = useModuleClient();
	return {
		detail: client.module("auctions").store["/auctions/:id"],
		bids: client.module("auctions").store["/auctions/:id/bids"],
	};
}

export function AuctionPage({ auctionId }: { auctionId: string }) {
	const api = useAuctionPageApi();

	const { data: auctionData, isLoading: loading } = api.detail.useQuery({
		id: auctionId,
	}) as {
		data: { auction: AuctionData } | undefined;
		isLoading: boolean;
	};

	const { data: bidsData } = api.bids.useQuery({
		id: auctionId,
		take: "10",
	}) as {
		data: { bids: BidItem[] } | undefined;
	};

	return (
		<AuctionPageTemplate
			auction={auctionData?.auction}
			bids={bidsData?.bids ?? []}
			loading={loading}
		/>
	);
}
