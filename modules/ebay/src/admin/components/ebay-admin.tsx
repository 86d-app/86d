"use client";

import { useModuleClient } from "@86d-app/core/client";
import EbayAdminTemplate from "./ebay-admin.mdx";

function useEbayAdminApi() {
	const client = useModuleClient();
	return {
		listListings: client.module("ebay").admin["/admin/ebay"],
	};
}

export function EbayAdmin() {
	const api = useEbayAdminApi();

	const { data, isLoading: loading } = api.listListings.useQuery({}) as {
		data: { listings: unknown[]; total: number } | undefined;
		isLoading: boolean;
	};

	const total = data?.total ?? 0;
	const subtitle = `${total} ${total === 1 ? "listing" : "listings"}`;

	return <EbayAdminTemplate subtitle={subtitle} loading={loading} />;
}
