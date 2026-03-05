"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useCallback, useRef } from "react";

export function useProductsApi() {
	const client = useModuleClient();
	return {
		listProducts: client.module("products").store["/products"],
		getFeaturedProducts: client.module("products").store["/products/featured"],
		getProduct: client.module("products").store["/products/:id"],
		getRelatedProducts:
			client.module("products").store["/products/:id/related"],
		listCategories: client.module("products").store["/categories"],
	};
}

export function useCartMutation() {
	const client = useModuleClient();
	return {
		addToCart: client.module("cart").store["/cart"],
		getCart: client.module("cart").store["/cart/get"],
	};
}

export function useReviewsApi() {
	const client = useModuleClient();
	return {
		listProductReviews:
			client.module("reviews").store["/reviews/products/:productId"],
		submitReview: client.module("reviews").store["/reviews"],
	};
}

export function useInventoryApi() {
	const client = useModuleClient();
	return {
		checkStock: client.module("inventory").store["/inventory/check"],
		subscribeBackInStock:
			client.module("inventory").store["/inventory/back-in-stock/subscribe"],
		checkBackInStock:
			client.module("inventory").store["/inventory/back-in-stock/check"],
		unsubscribeBackInStock:
			client.module("inventory").store["/inventory/back-in-stock/unsubscribe"],
	};
}

export function useAnalyticsApi() {
	const client = useModuleClient();
	return {
		recentlyViewed:
			client.module("analytics").store["/analytics/recently-viewed"],
	};
}

/** Fire-and-forget analytics event via the analytics module endpoint. */
export function useTrack() {
	const client = useModuleClient();
	const tracker = client.module("analytics").store["/analytics/events"];
	const ref = useRef(tracker);
	ref.current = tracker;

	return useCallback(
		(params: {
			type: string;
			productId?: string;
			value?: number;
			data?: Record<string, unknown>;
		}) => {
			try {
				void ref.current.mutate(params);
			} catch {
				// Analytics is best-effort
			}
		},
		[],
	);
}
