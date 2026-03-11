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

interface GroupDetail {
	id: string;
	name: string;
	slug: string;
	description?: string;
	type?: string;
	isActive?: boolean;
	priority?: number;
	memberCount?: number;
	isAutomatic: boolean;
	createdAt: string;
	updatedAt?: string;
}

interface GroupMember {
	id: string;
	customerId: string;
	customerEmail?: string;
	customerName?: string;
	joinedAt: string;
	expiresAt?: string;
}

interface GroupPriceAdjustment {
	id: string;
	adjustmentType: "percentage" | "fixed";
	value: number;
	scope: "all" | "category" | "product";
	scopeId?: string;
}

export function CustomerGroupDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";
	const client = useModuleClient();
	const detailApi =
		client.module("customer-groups").admin["/admin/customer-groups/:id"];
	const membersApi =
		client.module("customer-groups").admin[
			"/admin/customer-groups/:id/members"
		];
	const pricingApi =
		client.module("customer-groups").admin[
			"/admin/customer-groups/:id/pricing/list"
		];

	const { data, isLoading } = detailApi.useQuery({ id }) as {
		data: { group?: GroupDetail } | undefined;
		isLoading: boolean;
	};

	const { data: membersData } = membersApi.useQuery({ id }) as {
		data: { members?: GroupMember[] } | undefined;
	};

	const { data: pricingData } = pricingApi.useQuery({ id }) as {
		data: { adjustments?: GroupPriceAdjustment[] } | undefined;
	};

	const group = data?.group;
	const members = membersData?.members ?? [];
	const adjustments = pricingData?.adjustments ?? [];

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/customer-groups"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Customer Groups
					</a>
				</div>
				<div className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-32 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			</div>
		);
	}

	if (!group) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/customer-groups"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Customer Groups
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">Group not found.</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/customer-groups"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Customer Groups
				</a>
			</div>

			{/* Header */}
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="font-bold text-2xl text-foreground">{group.name}</h1>
						<span
							className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
								group.isAutomatic
									? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{group.isAutomatic ? "Automatic" : "Manual"}
						</span>
					</div>
					{group.description ? (
						<p className="mt-1 text-muted-foreground text-sm">
							{group.description}
						</p>
					) : null}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column */}
				<div className="space-y-6 lg:col-span-2">
					{/* Members */}
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Members ({members.length})
							</h2>
						</div>
						{members.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No members in this group yet.
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="border-border border-b text-left">
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Customer
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Joined
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Expires
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{members.map((m) => (
										<tr key={m.id}>
											<td className="px-4 py-2.5">
												<p className="font-medium text-foreground text-sm">
													{m.customerName ?? m.customerId}
												</p>
												{m.customerEmail ? (
													<p className="text-muted-foreground text-xs">
														{m.customerEmail}
													</p>
												) : null}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm">
												{new Date(m.joinedAt).toLocaleDateString()}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm">
												{m.expiresAt
													? new Date(m.expiresAt).toLocaleDateString()
													: "Never"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					{/* Pricing adjustments */}
					{adjustments.length > 0 ? (
						<div className="rounded-lg border border-border bg-card">
							<div className="border-border border-b px-4 py-3">
								<h2 className="font-semibold text-foreground text-sm">
									Pricing Adjustments
								</h2>
							</div>
							<table className="w-full">
								<thead>
									<tr className="border-border border-b text-left">
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Discount
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Scope
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{adjustments.map((adj) => (
										<tr key={adj.id}>
											<td className="px-4 py-2.5 font-medium text-foreground text-sm">
												{adj.adjustmentType === "percentage"
													? `${adj.value}% off`
													: `$${(adj.value / 100).toFixed(2)} off`}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm capitalize">
												{adj.scope}
												{adj.scopeId ? `: ${adj.scopeId.slice(0, 8)}...` : ""}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
				</div>

				{/* Right column */}
				<div className="space-y-6">
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Slug</dt>
								<dd className="font-medium font-mono text-foreground">
									{group.slug}
								</dd>
							</div>
							{group.priority != null ? (
								<div>
									<dt className="text-muted-foreground">Priority</dt>
									<dd className="font-medium text-foreground">
										{group.priority}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Members</dt>
								<dd className="font-medium text-foreground">
									{group.memberCount ?? members.length}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Created</dt>
								<dd className="font-medium text-foreground">
									{new Date(group.createdAt).toLocaleDateString()}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</div>
	);
}
