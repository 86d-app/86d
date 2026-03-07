"use client";

import { usePagesApi } from "./_hooks";
import PageDetailTemplate from "./page-detail.mdx";

interface PageData {
	id: string;
	title: string;
	slug: string;
	content: string;
	excerpt?: string | null;
	featuredImage?: string | null;
	publishedAt?: string | null;
	updatedAt: string;
}

export function PageDetail({ slug }: { slug: string }) {
	const api = usePagesApi();

	const { data, isLoading } = api.getPage.useQuery({
		params: { slug },
	}) as {
		data: { page: PageData | null } | undefined;
		isLoading: boolean;
	};

	const page = data?.page ?? null;

	return <PageDetailTemplate isLoading={isLoading} page={page} />;
}
