"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import WrapOptionListTemplate from "./wrap-option-list.mdx";

const PAGE_SIZE = 50;

interface WrapOptionItem {
	id: string;
	name: string;
	description?: string;
	priceInCents: number;
	imageUrl?: string;
	active: boolean;
	sortOrder: number;
	createdAt: string;
}

interface SummaryData {
	totalOptions: number;
	activeOptions: number;
	totalSelections: number;
	totalRevenue: number;
}

function useGiftWrappingApi() {
	const client = useModuleClient();
	return {
		list: client.module("gift-wrapping").admin["/admin/gift-wrapping"],
		summary:
			client.module("gift-wrapping").admin["/admin/gift-wrapping/summary"],
	};
}

export function WrapOptionList() {
	const api = useGiftWrappingApi();
	const [activeFilter, setActiveFilter] = useState("");

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
	};
	if (activeFilter) queryInput.active = activeFilter;

	const { data: listData, isLoading: loading } = api.list.useQuery(
		queryInput,
	) as {
		data: { options: WrapOptionItem[] } | undefined;
		isLoading: boolean;
	};

	const { data: summaryData } = api.summary.useQuery({}) as {
		data: { summary: SummaryData } | undefined;
	};

	const options = listData?.options ?? [];
	const summary = summaryData?.summary;

	return (
		<WrapOptionListTemplate
			options={options}
			summary={summary}
			loading={loading}
			activeFilter={activeFilter}
			onActiveChange={setActiveFilter}
		/>
	);
}
