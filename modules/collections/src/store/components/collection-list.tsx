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
		limit: limit ? String(limit) : undefined,
	}) as {
		data:
			| {
					collections: Array<{
						id: string;
						name: string;
						slug: string;
						description?: string | null;
						image?: string | null;
						isFeatured: boolean;
					}>;
			  }
			| undefined;
		isLoading: boolean;
	};

	const collections: CollectionData[] = (data?.collections ?? []).map((c) => {
		const row: CollectionData = {
			id: c.id,
			title: c.name,
			slug: c.slug,
			type: "manual",
			isFeatured: c.isFeatured,
		};
		if (c.description != null) row.description = c.description;
		if (c.image != null) row.image = c.image;
		return row;
	});

	if (isLoading || collections.length === 0) return null;

	return <CollectionListTemplate collections={collections} />;
}
