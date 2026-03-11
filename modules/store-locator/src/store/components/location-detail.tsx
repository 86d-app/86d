"use client";

import { useStoreLocatorApi } from "./_hooks";
import LocationDetailTemplate from "./location-detail.mdx";

interface DayHours {
	open: string;
	close: string;
	closed?: boolean;
}

interface LocationData {
	id: string;
	name: string;
	slug: string;
	description?: string;
	address: string;
	city: string;
	state?: string;
	postalCode?: string;
	country: string;
	latitude: number;
	longitude: number;
	phone?: string;
	email?: string;
	website?: string;
	imageUrl?: string;
	hours?: Record<string, DayHours>;
	amenities?: string[];
	isFeatured: boolean;
	pickupEnabled: boolean;
}

interface HoursData {
	open: boolean;
	currentDay: string;
	hours?: DayHours;
}

export function LocationDetail({ slug }: { slug: string }) {
	const api = useStoreLocatorApi();

	const { data, isLoading } = api.getLocation.useQuery({
		slug,
	}) as {
		data: { location: LocationData } | undefined;
		isLoading: boolean;
	};

	const location = data?.location;

	const { data: hoursData } = api.checkHours.useQuery(
		location ? { id: location.id } : {},
	) as {
		data: HoursData | undefined;
	};

	if (isLoading) return null;
	if (!location)
		return <p className="text-muted-foreground">Location not found.</p>;

	return (
		<LocationDetailTemplate
			location={location}
			isOpen={hoursData?.open}
			currentDay={hoursData?.currentDay}
		/>
	);
}
