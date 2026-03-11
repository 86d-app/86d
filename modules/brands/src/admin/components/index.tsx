"use client";

import { useModuleClient } from "@86d-app/core/client";

interface Brand {
	id: string;
	name: string;
	slug: string;
	description?: string;
	logoUrl?: string;
	websiteUrl?: string;
	isActive: boolean;
	productCount?: number;
	createdAt: string;
}

function useBrandsApi() {
	const client = useModuleClient();
	return {
		list: client.module("brands").admin["/admin/brands"],
	};
}

export function BrandAdmin() {
	const api = useBrandsApi();
	const { data, isLoading } = api.list.useQuery({}) as {
		data: { brands?: Brand[] } | undefined;
		isLoading: boolean;
	};

	const brands = data?.brands ?? [];

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Brands</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage product brands and manufacturers
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
			) : brands.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No brands created yet. Create your first brand to organize products
						by manufacturer.
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b text-left">
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Brand
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Products
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{brands.map((brand) => (
								<tr key={brand.id} className="hover:bg-muted/50">
									<td className="px-4 py-3">
										<div className="flex items-center gap-3">
											{brand.logoUrl ? (
												<img
													src={brand.logoUrl}
													alt={brand.name}
													className="size-8 rounded object-contain"
												/>
											) : (
												<div className="flex size-8 items-center justify-center rounded bg-muted font-medium text-muted-foreground text-xs">
													{brand.name[0]}
												</div>
											)}
											<div>
												<p className="font-medium text-foreground text-sm">
													{brand.name}
												</p>
												<p className="text-muted-foreground text-xs">
													/{brand.slug}
												</p>
											</div>
										</div>
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												brand.isActive
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
											}`}
										>
											{brand.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{brand.productCount ?? 0}
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
