"use client";

import { useRecommendationsApi } from "./_hooks";
import { formatPrice } from "./_utils";
import TrendingProductsTemplate from "./trending-products.mdx";

interface RecommendedProduct {
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	productPrice?: number | undefined;
	score: number;
	strategy: string;
}

export interface TrendingProductsProps {
	/** Section title */
	title?: string | undefined;
	/** Max number of products */
	limit?: number | undefined;
}

export function TrendingProducts({
	title = "Trending now",
	limit = 8,
}: TrendingProductsProps) {
	const api = useRecommendationsApi();

	const { data, isLoading } = api.getTrending.useQuery({
		...(limit ? { take: String(limit) } : {}),
	}) as {
		data: { recommendations: RecommendedProduct[] } | undefined;
		isLoading: boolean;
	};

	const recommendations = data?.recommendations ?? [];

	if (!isLoading && recommendations.length === 0) {
		return null;
	}

	const items = recommendations.map((r) => ({
		id: r.productId,
		name: r.productName,
		slug: r.productSlug,
		image: r.productImage,
		price: r.productPrice != null ? formatPrice(r.productPrice) : undefined,
		href: `/products/${r.productSlug}`,
	}));

	return (
		<TrendingProductsTemplate
			title={title}
			items={items}
			isLoading={isLoading}
		/>
	);
}
