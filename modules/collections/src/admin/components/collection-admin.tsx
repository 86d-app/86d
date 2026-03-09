"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import CollectionAdminTemplate from "./collection-admin.mdx";

const PAGE_SIZE = 20;

interface CollectionData {
	id: string;
	title: string;
	slug: string;
	description?: string;
	type: string;
	isActive: boolean;
	isFeatured: boolean;
	position: number;
	createdAt: string;
}

interface StatsData {
	totalCollections: number;
	activeCollections: number;
	featuredCollections: number;
	manualCollections: number;
	automaticCollections: number;
	totalProducts: number;
}

function useCollectionAdminApi() {
	const client = useModuleClient();
	return {
		list: client.module("collections").admin["/admin/collections"],
		stats: client.module("collections").admin["/admin/collections/stats"],
		create: client.module("collections").admin["/admin/collections/create"],
		deleteCollection:
			client.module("collections").admin["/admin/collections/:id/delete"],
	};
}

export function CollectionAdmin() {
	const api = useCollectionAdminApi();
	const [skip, setSkip] = useState(0);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const [error, setError] = useState("");

	const { data: listData, isLoading: listLoading } = api.list.useQuery({
		take: String(PAGE_SIZE),
		skip: String(skip),
	}) as {
		data: { collections: CollectionData[]; total: number } | undefined;
		isLoading: boolean;
	};

	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats: StatsData } | undefined;
	};

	const deleteMutation = api.deleteCollection.useMutation({
		onSettled: () => {
			setDeleteConfirm(null);
			void api.list.invalidate();
			void api.stats.invalidate();
		},
		onError: (err: Error) => {
			setError(err.message ?? "Failed to delete");
		},
	});

	const handleDelete = (id: string) => {
		deleteMutation.mutate({ id });
	};

	return (
		<CollectionAdminTemplate
			collections={listData?.collections ?? []}
			total={listData?.total ?? 0}
			stats={statsData?.stats}
			isLoading={listLoading}
			skip={skip}
			pageSize={PAGE_SIZE}
			onPageChange={setSkip}
			deleteConfirm={deleteConfirm}
			onDeleteConfirm={setDeleteConfirm}
			onDelete={handleDelete}
			error={error}
		/>
	);
}
