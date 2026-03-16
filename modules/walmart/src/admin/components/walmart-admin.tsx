"use client";

import { useModuleClient } from "@86d-app/core/client";
import WalmartAdminTemplate from "./walmart-admin.mdx";

function useWalmartAdminApi() {
	const client = useModuleClient();
	return {
		listItems: client.module("walmart").admin["/admin/walmart"],
	};
}

export function WalmartAdmin() {
	const api = useWalmartAdminApi();

	const { data, isLoading: loading } = api.listItems.useQuery({}) as {
		data: { items: unknown[]; total: number } | undefined;
		isLoading: boolean;
	};

	const total = data?.total ?? 0;
	const subtitle = `${total} ${total === 1 ? "item" : "items"}`;

	return <WalmartAdminTemplate subtitle={subtitle} loading={loading} />;
}
