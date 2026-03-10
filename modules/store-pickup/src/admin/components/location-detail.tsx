"use client";

import { useModuleClient } from "@86d-app/core/client";
import LocationDetailTemplate from "./location-detail.mdx";

const DAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

interface LocationData {
	id: string;
	name: string;
	address: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	phone?: string;
	email?: string;
	preparationMinutes: number;
	active: boolean;
}

interface WindowItem {
	id: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
	capacity: number;
	active: boolean;
}

function useLocationApi(locationId: string) {
	const client = useModuleClient();
	return {
		location:
			client.module("store-pickup").admin["/admin/store-pickup/locations/:id"],
		windows: client.module("store-pickup").admin["/admin/store-pickup/windows"],
		locationId,
	};
}

export function LocationDetail({ locationId }: { locationId: string }) {
	const api = useLocationApi(locationId);

	const { data: locData, isLoading: loadingLoc } = api.location.useQuery({
		id: locationId,
	}) as {
		data: { location: LocationData } | undefined;
		isLoading: boolean;
	};

	const { data: winData, isLoading: loadingWin } = api.windows.useQuery({
		locationId,
	}) as {
		data: { windows: WindowItem[] } | undefined;
		isLoading: boolean;
	};

	const location = locData?.location;
	const windows = winData?.windows ?? [];

	return (
		<LocationDetailTemplate
			location={location}
			windows={windows}
			loading={loadingLoc || loadingWin}
			dayNames={DAY_NAMES}
		/>
	);
}
