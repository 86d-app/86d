"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useReviewsApi() {
	const client = useModuleClient();
	return {
		submitReview: client.module("reviews").store["/reviews"],
		listProductReviews:
			client.module("reviews").store["/reviews/products/:productId"],
		markHelpful: client.module("reviews").store["/reviews/:id/helpful"],
	};
}
