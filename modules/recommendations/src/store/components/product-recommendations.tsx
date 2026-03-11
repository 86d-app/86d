"use client";

import { useRecommendationsApi } from "./_hooks";
import { formatPrice } from "./_utils";
import ProductRecommendationsTemplate from "./product-recommendations.mdx";

interface RecommendedProduct {
	productId: string;
	productName: string;
	productSlug: string;
	productImage?: string | undefined;
	productPrice?: number | undefined;
	score: number;
	strategy: string;
}

export interface ProductRecommendationsProps {
	/** The product ID to get recommendations for */
	productId: string;
	/** Section title */
	title?: string | undefined;
	/** Recommendation strategy to use */
	strategy?: "manual" | "bought_together" | undefined;
	/** Max number of recommendations */
	limit?: number | undefined;
}

export function ProductRecommendations({
	productId,
	title = "You may also like",
	strategy,
	limit = 6,
}: ProductRecommendationsProps) {
	const api = useRecommendationsApi();

	const { data, isLoading } = api.getForProduct.useQuery({
		params: { productId },
		...(strategy ? { strategy } : {}),
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
		<ProductRecommendationsTemplate
			title={title}
			items={items}
			isLoading={isLoading}
		/>
	);
}
