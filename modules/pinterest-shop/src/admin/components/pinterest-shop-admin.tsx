"use client";

import { useModuleClient } from "@86d-app/core/client";
import PinterestShopAdminTemplate from "./pinterest-shop-admin.mdx";

function usePinterestShopAdminApi() {
	const client = useModuleClient();
	return {
		listItems: client.module("pinterest-shop").admin["/admin/pinterest-shop"],
	};
}

export function PinterestShopAdmin() {
	const api = usePinterestShopAdminApi();

	const { data, isLoading: loading } = api.listItems.useQuery({}) as {
		data: { items: unknown[]; total: number } | undefined;
		isLoading: boolean;
	};

	const total = data?.total ?? 0;
	const subtitle = `${total} catalog ${total === 1 ? "item" : "items"}`;

	return <PinterestShopAdminTemplate subtitle={subtitle} loading={loading} />;
}
