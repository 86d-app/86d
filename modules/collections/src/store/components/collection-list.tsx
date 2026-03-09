"use client";

import { useCollectionsApi } from "./_hooks";
import CollectionListTemplate from "./collection-list.mdx";

interface CollectionData {
	id: string;
	title: string;
	slug: string;
	description?: string;
	image?: string;
	type: string;
	isFeatured: boolean;
}

export function CollectionList({
	featured,
	limit,
}: {
	featured?: boolean;
	limit?: number;
}) {
	const api = useCollectionsApi();

	const { data, isLoading } = api.listCollections.useQuery({
		featured: featured ? "true" : undefined,
		take: limit ? String(limit) : undefined,
	}) as {
		data: { collections: CollectionData[] } | undefined;
		isLoading: boolean;
	};

	const collections = data?.collections ?? [];

	if (isLoading || collections.length === 0) return null;

	return <CollectionListTemplate collections={collections} />;
}
