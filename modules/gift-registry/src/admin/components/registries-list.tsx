"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import RegistriesListTemplate from "./registries-list.mdx";

const PAGE_SIZE = 20;

interface RegistryListItem {
	id: string;
	customerName: string;
	title: string;
	type: string;
	visibility: string;
	status: string;
	itemCount: number;
	purchasedCount: number;
	eventDate?: string;
	createdAt: string;
}

interface SummaryData {
	totalRegistries: number;
	active: number;
	completed: number;
	archived: number;
	totalItems: number;
	totalPurchased: number;
	totalRevenue: number;
}

const STATUS_COLORS: Record<string, string> = {
	active: "text-green-700 bg-green-50 border-green-200",
	completed: "text-blue-700 bg-blue-50 border-blue-200",
	archived: "text-gray-700 bg-gray-50 border-gray-200",
};

const TYPE_LABELS: Record<string, string> = {
	wedding: "Wedding",
	baby: "Baby",
	birthday: "Birthday",
	housewarming: "Housewarming",
	holiday: "Holiday",
	other: "Other",
};

function useRegistryApi() {
	const client = useModuleClient();
	return {
		list: client.module("gift-registry").admin["/admin/gift-registry"],
		summary:
			client.module("gift-registry").admin["/admin/gift-registry/summary"],
	};
}

export function RegistriesList() {
	const api = useRegistryApi();
	const [statusFilter, setStatusFilter] = useState("");

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
	};
	if (statusFilter) queryInput.status = statusFilter;

	const { data: listData, isLoading: loading } = api.list.useQuery(
		queryInput,
	) as {
		data: { registries: RegistryListItem[] } | undefined;
		isLoading: boolean;
	};

	const { data: summaryData } = api.summary.useQuery({}) as {
		data: { summary: SummaryData } | undefined;
	};

	const registries = listData?.registries ?? [];
	const summary = summaryData?.summary;

	return (
		<RegistriesListTemplate
			registries={registries}
			summary={summary}
			loading={loading}
			statusFilter={statusFilter}
			onStatusChange={setStatusFilter}
			statusColors={STATUS_COLORS}
			typeLabels={TYPE_LABELS}
		/>
	);
}
