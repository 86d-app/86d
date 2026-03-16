"use client";

import { useModuleClient } from "@86d-app/core/client";
import DoorDashAdminTemplate from "./doordash-admin.mdx";

function useDoordashAdminApi() {
	const client = useModuleClient();
	return {
		listDeliveries:
			client.module("doordash").admin["/admin/doordash/deliveries"],
	};
}

export function DoorDashAdmin() {
	const api = useDoordashAdminApi();
	const { data, isLoading: loading } = api.listDeliveries.useQuery({}) as {
		data:
			| {
					deliveries: Array<{
						id: string;
						orderId: string;
						status: string;
						fee: number;
					}>;
					total: number;
			  }
			| undefined;
		isLoading: boolean;
	};

	const deliveries = data?.deliveries ?? [];

	return (
		<DoorDashAdminTemplate>
			{loading ? (
				<p className="text-muted-foreground text-sm">Loading deliveries...</p>
			) : deliveries.length === 0 ? (
				<p className="text-muted-foreground text-sm">No deliveries found.</p>
			) : (
				<ul className="space-y-2">
					{deliveries.map((d) => (
						<li
							key={d.id}
							className="flex items-center justify-between rounded-md border border-border p-3"
						>
							<span className="text-foreground text-sm">Order {d.orderId}</span>
							<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
								{d.status}
							</span>
						</li>
					))}
				</ul>
			)}
		</DoorDashAdminTemplate>
	);
}
