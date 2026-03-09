"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useCollectionsApi() {
	const client = useModuleClient();
	return {
		listCollections: client.module("collections").store["/collections"],
		getCollection: client.module("collections").store["/collections/:slug"],
		getCollectionProducts:
			client.module("collections").store["/collections/:slug/products"],
		getFeatured: client.module("collections").store["/collections/featured"],
		getProductCollections:
			client.module("collections").store["/collections/product/:productId"],
	};
}
