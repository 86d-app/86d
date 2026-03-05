import {
	dehydrate,
	getQueryClient,
	HydrationBoundary,
} from "@86d-app/core/client";
import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";
import { prefetchCategories, prefetchProducts } from "~/lib/server-prefetch";
import ProductsPageClient from "./products-page-client";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Products — ${storeName}`,
	description: `Browse our full product catalog at ${storeName}. Find exactly what you're looking for.`,
};

export default async function ProductsPage() {
	const queryClient = getQueryClient();

	// Prefetch products and categories in parallel
	const [productsData, categoriesData] = await Promise.all([
		prefetchProducts({ page: 1, limit: 12 }),
		prefetchCategories(),
	]);

	// Populate the query cache with the same keys the client components will use
	if (productsData) {
		queryClient.setQueryData(
			[
				"products",
				"store",
				"/products",
				{
					page: "1",
					limit: "12",
					sort: "createdAt",
					order: "desc",
				},
			],
			productsData,
		);
	}

	if (categoriesData) {
		queryClient.setQueryData(
			["products", "store", "/categories"],
			categoriesData,
		);
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ProductsPageClient />
		</HydrationBoundary>
	);
}
