"use client";

import { useModuleClient } from "@86d-app/core/client";
import WishAdminTemplate from "./wish-admin.mdx";

function useWishAdminApi() {
	const client = useModuleClient();
	return {
		listProducts: client.module("wish").admin["/admin/wish"],
	};
}

export function WishAdmin() {
	const api = useWishAdminApi();

	const { data, isLoading: loading } = api.listProducts.useQuery({}) as {
		data: { products: unknown[]; total: number } | undefined;
		isLoading: boolean;
	};

	const total = data?.total ?? 0;
	const subtitle = `${total} ${total === 1 ? "product" : "products"}`;

	return <WishAdminTemplate subtitle={subtitle} loading={loading} />;
}
