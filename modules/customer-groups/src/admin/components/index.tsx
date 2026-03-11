"use client";

import { useModuleClient } from "@86d-app/core/client";

interface CustomerGroup {
	id: string;
	name: string;
	slug: string;
	description?: string;
	memberCount?: number;
	isAutomatic: boolean;
	createdAt: string;
}

function useCustomerGroupsApi() {
	const client = useModuleClient();
	return {
		list: client.module("customer-groups").admin["/admin/customer-groups"],
	};
}

export function CustomerGroupList() {
	const api = useCustomerGroupsApi();
	const { data, isLoading } = api.list.useQuery({}) as {
		data: { groups?: CustomerGroup[] } | undefined;
		isLoading: boolean;
	};

	const groups = data?.groups ?? [];

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">
						Customer Groups
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Segment customers into groups for targeted pricing and promotions
					</p>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : groups.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No customer groups created yet. Groups let you segment customers for
						targeted promotions and pricing.
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b text-left">
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Group
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Type
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Members
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{groups.map((group) => (
								<tr key={group.id} className="hover:bg-muted/50">
									<td className="px-4 py-3">
										<p className="font-medium text-foreground text-sm">
											{group.name}
										</p>
										{group.description ? (
											<p className="text-muted-foreground text-xs">
												{group.description}
											</p>
										) : null}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												group.isAutomatic
													? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{group.isAutomatic ? "Automatic" : "Manual"}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{group.memberCount ?? 0}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export function CustomerGroupDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/customer-groups"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Customer Groups
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					Customer Group
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Group ID: {id || "Unknown"}
				</p>
			</div>

			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">
					Customer group detail view is under development.
				</p>
			</div>
		</div>
	);
}
