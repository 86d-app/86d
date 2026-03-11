"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useRecommendationsApi() {
	const client = useModuleClient();
	return {
		getForProduct:
			client.module("recommendations").store["/recommendations/:productId"],
		getTrending:
			client.module("recommendations").store["/recommendations/trending"],
		getPersonalized:
			client.module("recommendations").store["/recommendations/personalized"],
		trackInteraction:
			client.module("recommendations").store["/recommendations/track"],
	};
}
