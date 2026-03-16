"use client";

import { useModuleClient } from "@86d-app/core/client";
import UberEatsAdminTemplate from "./uber-eats-admin.mdx";

function useUberEatsAdminApi() {
	const client = useModuleClient();
	return {
		listOrders: client.module("uber-eats").admin["/admin/uber-eats/orders"],
	};
}

export function UberEatsAdmin() {
	const api = useUberEatsAdminApi();
	const { data, isLoading: loading } = api.listOrders.useQuery({}) as {
		data:
			| {
					orders: Array<{
						id: string;
						externalOrderId: string;
						status: string;
						total: number;
					}>;
					total: number;
			  }
			| undefined;
		isLoading: boolean;
	};

	const orders = data?.orders ?? [];

	return (
		<UberEatsAdminTemplate>
			{loading ? (
				<p className="text-muted-foreground text-sm">Loading orders...</p>
			) : orders.length === 0 ? (
				<p className="text-muted-foreground text-sm">No orders found.</p>
			) : (
				<ul className="space-y-2">
					{orders.map((o) => (
						<li
							key={o.id}
							className="flex items-center justify-between rounded-md border border-border p-3"
						>
							<span className="text-foreground text-sm">
								{o.externalOrderId}
							</span>
							<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
								{o.status}
							</span>
						</li>
					))}
				</ul>
			)}
		</UberEatsAdminTemplate>
	);
}
