"use client";

import { useModuleClient } from "@86d-app/core/client";
import ToastAdminTemplate from "./toast-admin.mdx";

function useToastAdminApi() {
	const client = useModuleClient();
	return {
		listSyncRecords: client.module("toast").admin["/admin/toast/sync-records"],
	};
}

export function ToastAdmin() {
	const api = useToastAdminApi();
	const { data, isLoading: loading } = api.listSyncRecords.useQuery({}) as {
		data:
			| {
					records: Array<{
						id: string;
						entityType: string;
						status: string;
					}>;
					total: number;
			  }
			| undefined;
		isLoading: boolean;
	};

	const records = data?.records ?? [];

	return (
		<ToastAdminTemplate>
			{loading ? (
				<p className="text-muted-foreground text-sm">Loading sync records...</p>
			) : records.length === 0 ? (
				<p className="text-muted-foreground text-sm">No sync records found.</p>
			) : (
				<ul className="space-y-2">
					{records.map((r) => (
						<li
							key={r.id}
							className="flex items-center justify-between rounded-md border border-border p-3"
						>
							<span className="text-foreground text-sm">{r.entityType}</span>
							<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
								{r.status}
							</span>
						</li>
					))}
				</ul>
			)}
		</ToastAdminTemplate>
	);
}
