"use client";

import { useState } from "react";
import { useStoreLocatorApi } from "./_hooks";
import LocationListTemplate from "./location-list.mdx";

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
	phone?: string;
	email?: string;
	imageUrl?: string;
	isActive: boolean;
	isFeatured: boolean;
	pickupEnabled: boolean;
}

interface RegionData {
	regions: string[];
	countries: string[];
}

export function LocationList({ limit }: { limit?: number }) {
	const api = useStoreLocatorApi();
	const [country, setCountry] = useState("");

	const { data: regionData } = api.getRegions.useQuery({}) as {
		data: RegionData | undefined;
	};

	const { data, isLoading } = api.listLocations.useQuery({
		country: country || undefined,
		limit: limit ? String(limit) : undefined,
	}) as {
		data: { locations: LocationData[] } | undefined;
		isLoading: boolean;
	};

	const locations = data?.locations ?? [];
	const countries = regionData?.countries ?? [];

	if (isLoading) return null;

	return (
		<LocationListTemplate
			locations={locations}
			countries={countries}
			selectedCountry={country}
			onCountryChange={setCountry}
		/>
	);
}
