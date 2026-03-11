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

interface PricingRuleDetail {
	id: string;
	name?: string;
	description?: string;
	scope?: string;
	targetId?: string;
	priority?: number;
	active: boolean;
	startsAt?: string;
	endsAt?: string;
	createdAt: string;
	updatedAt?: string;
}

interface PricingTier {
	id: string;
	ruleId: string;
	minQuantity: number;
	maxQuantity?: number;
	discountType: "percentage" | "fixed_amount" | "fixed_price";
	discountValue: number;
	label?: string;
}

export function BulkPricingDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";
	const client = useModuleClient();
	const ruleApi =
		client.module("bulk-pricing").admin["/admin/bulk-pricing/rules/:id"];
	const previewApi =
		client.module("bulk-pricing").admin[
			"/admin/bulk-pricing/rules/:id/preview"
		];

	const { data, isLoading } = ruleApi.useQuery({ id }) as {
		data: { rule?: PricingRuleDetail } | undefined;
		isLoading: boolean;
	};

	const { data: previewData } = previewApi.useQuery({ id }) as {
		data: { tiers?: PricingTier[] } | undefined;
	};

	const rule = data?.rule;
	const tiers = previewData?.tiers ?? [];

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/bulk-pricing"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Bulk Pricing
					</a>
				</div>
				<div className="space-y-4">
					<div className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
					<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
				</div>
			</div>
		);
	}

	if (!rule) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/bulk-pricing"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Bulk Pricing
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						Pricing rule not found.
					</p>
				</div>
			</div>
		);
	}

	function formatDiscount(tier: PricingTier): string {
		switch (tier.discountType) {
			case "percentage":
				return `${tier.discountValue}% off`;
			case "fixed_amount":
				return `$${(tier.discountValue / 100).toFixed(2)} off per unit`;
			case "fixed_price":
				return `$${(tier.discountValue / 100).toFixed(2)} per unit`;
			default:
				return `${tier.discountValue}`;
		}
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/bulk-pricing"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Bulk Pricing
				</a>
			</div>

			{/* Header */}
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="font-bold text-2xl text-foreground">
							{rule.name ?? "Pricing Rule"}
						</h1>
						<span
							className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
								rule.active
									? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
									: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
							}`}
						>
							{rule.active ? "Active" : "Inactive"}
						</span>
					</div>
					{rule.description ? (
						<p className="mt-1 text-muted-foreground text-sm">
							{rule.description}
						</p>
					) : null}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - tiers */}
				<div className="lg:col-span-2">
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Pricing Tiers ({tiers.length})
							</h2>
						</div>
						{tiers.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No tiers configured for this rule.
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="border-border border-b text-left">
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Quantity Range
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Discount
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Label
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{tiers.map((tier) => (
										<tr key={tier.id}>
											<td className="px-4 py-2.5 font-medium text-foreground text-sm tabular-nums">
												{tier.minQuantity}
												{tier.maxQuantity
													? ` – ${tier.maxQuantity}`
													: "+ units"}
											</td>
											<td className="px-4 py-2.5 text-foreground text-sm">
												{formatDiscount(tier)}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm">
												{tier.label ?? "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>

				{/* Right column - details */}
				<div>
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<dl className="space-y-2 text-sm">
							{rule.scope ? (
								<div>
									<dt className="text-muted-foreground">Scope</dt>
									<dd className="font-medium text-foreground capitalize">
										{rule.scope}
									</dd>
								</div>
							) : null}
							{rule.priority != null ? (
								<div>
									<dt className="text-muted-foreground">Priority</dt>
									<dd className="font-medium text-foreground">
										{rule.priority}
									</dd>
								</div>
							) : null}
							{rule.startsAt ? (
								<div>
									<dt className="text-muted-foreground">Starts</dt>
									<dd className="font-medium text-foreground">
										{new Date(rule.startsAt).toLocaleDateString()}
									</dd>
								</div>
							) : null}
							{rule.endsAt ? (
								<div>
									<dt className="text-muted-foreground">Ends</dt>
									<dd className="font-medium text-foreground">
										{new Date(rule.endsAt).toLocaleDateString()}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Created</dt>
								<dd className="font-medium text-foreground">
									{new Date(rule.createdAt).toLocaleDateString()}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</div>
	);
}
