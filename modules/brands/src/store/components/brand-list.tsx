"use client";

import { useBrandsApi } from "./_hooks";
import BrandListTemplate from "./brand-list.mdx";

interface BrandData {
	id: string;
	name: string;
	slug: string;
	description?: string;
	logo?: string;
	isFeatured: boolean;
}

export function BrandList({ limit }: { limit?: number }) {
	const api = useBrandsApi();

	const { data, isLoading } = api.listBrands.useQuery({
		take: limit ? String(limit) : undefined,
	}) as {
		data: { brands: BrandData[] } | undefined;
		isLoading: boolean;
	};

	const brands = data?.brands ?? [];

	if (isLoading || brands.length === 0) return null;

	return <BrandListTemplate brands={brands} />;
}
