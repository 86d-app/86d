"use client";

import { useModuleClient } from "@86d-app/core/client";

interface BulkPriceRule {
	id: string;
	productId: string;
	minQuantity: number;
	maxQuantity?: number;
	discountType: "percentage" | "fixed";
	discountValue: number;
	isActive: boolean;
	createdAt: string;
}

function useBulkPricingApi() {
	const client = useModuleClient();
	return {
		list: client.module("bulk-pricing").admin["/admin/bulk-pricing"],
	};
}

export function BulkPricingList() {
	const api = useBulkPricingApi();
	const { data, isLoading } = api.list.useQuery({}) as {
		data: { rules?: BulkPriceRule[] } | undefined;
		isLoading: boolean;
	};

	const rules = data?.rules ?? [];

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Bulk Pricing</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Configure volume-based pricing tiers for products
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
			) : rules.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No bulk pricing rules configured. Create rules to offer volume
						discounts on products.
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b text-left">
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Product
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Quantity Range
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Discount
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{rules.map((rule) => (
								<tr key={rule.id} className="hover:bg-muted/50">
									<td className="px-4 py-3 font-medium text-foreground text-sm">
										{rule.productId.slice(0, 8)}...
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{rule.minQuantity}
										{rule.maxQuantity ? ` - ${rule.maxQuantity}` : "+"}
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{rule.discountType === "percentage"
											? `${rule.discountValue}%`
											: `$${(rule.discountValue / 100).toFixed(2)}`}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												rule.isActive
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
											}`}
										>
											{rule.isActive ? "Active" : "Inactive"}
										</span>
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

export function BulkPricingDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/bulk-pricing"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Bulk Pricing
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					Pricing Rule
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Rule ID: {id || "Unknown"}
				</p>
			</div>

			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">
					Bulk pricing rule detail view is under development.
				</p>
			</div>
		</div>
	);
}
