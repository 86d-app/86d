"use client";

import { sanitizeHtml } from "@86d-app/core";
import { useMemo } from "react";
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

	const sanitizedPage = useMemo(() => {
		if (!page) return null;
		return { ...page, content: sanitizeHtml(page.content) };
	}, [page]);

	return <PageDetailTemplate isLoading={isLoading} page={sanitizedPage} />;
}
