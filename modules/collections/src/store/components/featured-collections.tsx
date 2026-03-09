"use client";

import { useCollectionsApi } from "./_hooks";
import FeaturedCollectionsTemplate from "./featured-collections.mdx";

interface CollectionData {
	id: string;
	title: string;
	slug: string;
	description?: string;
	image?: string;
}

export function FeaturedCollections({ limit }: { limit?: number }) {
	const api = useCollectionsApi();

	const { data, isLoading } = api.getFeatured.useQuery({
		limit: limit ? String(limit) : undefined,
	}) as {
		data: { collections: CollectionData[] } | undefined;
		isLoading: boolean;
	};

	const collections = data?.collections ?? [];

	if (isLoading || collections.length === 0) return null;

	return <FeaturedCollectionsTemplate collections={collections} />;
}
