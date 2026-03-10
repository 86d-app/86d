"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import LocationListTemplate from "./location-list.mdx";

const PAGE_SIZE = 50;

interface LocationItem {
	id: string;
	name: string;
	address: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	preparationMinutes: number;
	active: boolean;
	sortOrder: number;
}

interface SummaryData {
	totalLocations: number;
	activeLocations: number;
	totalWindows: number;
	activeWindows: number;
	totalPickups: number;
	scheduledPickups: number;
	preparingPickups: number;
	readyPickups: number;
	completedPickups: number;
	cancelledPickups: number;
	blackoutDates: number;
}

function useStorePickupApi() {
	const client = useModuleClient();
	return {
		list: client.module("store-pickup").admin["/admin/store-pickup/locations"],
		summary: client.module("store-pickup").admin["/admin/store-pickup/summary"],
	};
}

export function LocationList() {
	const api = useStorePickupApi();
	const [activeFilter, setActiveFilter] = useState("");

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
	};
	if (activeFilter) queryInput.active = activeFilter;

	const { data: listData, isLoading: loading } = api.list.useQuery(
		queryInput,
	) as {
		data: { locations: LocationItem[] } | undefined;
		isLoading: boolean;
	};

	const { data: summaryData } = api.summary.useQuery({}) as {
		data: { summary: SummaryData } | undefined;
	};

	const locations = listData?.locations ?? [];
	const summaryInfo = summaryData?.summary;

	return (
		<LocationListTemplate
			locations={locations}
			summary={summaryInfo}
			loading={loading}
			activeFilter={activeFilter}
			onActiveChange={setActiveFilter}
		/>
	);
}
