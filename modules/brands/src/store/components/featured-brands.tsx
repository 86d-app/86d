"use client";

import { useBrandsApi } from "./_hooks";
import FeaturedBrandsTemplate from "./featured-brands.mdx";

interface BrandData {
	id: string;
	name: string;
	slug: string;
	description?: string;
	logo?: string;
}

export function FeaturedBrands({ limit }: { limit?: number }) {
	const api = useBrandsApi();

	const { data, isLoading } = api.getFeatured.useQuery({
		limit: limit ? String(limit) : undefined,
	}) as {
		data: { brands: BrandData[] } | undefined;
		isLoading: boolean;
	};

	const brands = data?.brands ?? [];

	if (isLoading || brands.length === 0) return null;

	return <FeaturedBrandsTemplate brands={brands} />;
}
