"use client";

import Link from "next/link";
import { useAnalyticsApi } from "./_hooks";
import { formatPrice } from "./_utils";

interface RecentlyViewedItem {
	productId: string;
	name: string;
	slug: string;
	price: number;
	image?: string | undefined;
	viewedAt: string;
}

export interface RecentlyViewedProductsProps {
	/** Current product ID to exclude from the list. */
	excludeProductId?: string;
	/** Maximum items to show (default: 6). */
	limit?: number;
	/** Section title (default: "Recently viewed"). */
	title?: string;
	/** Analytics session ID for anonymous visitors. */
	sessionId?: string;
}

export function RecentlyViewedProducts({
	excludeProductId,
	limit = 6,
	title = "Recently viewed",
	sessionId,
}: RecentlyViewedProductsProps) {
	const api = useAnalyticsApi();

	const { data, isLoading } = api.recentlyViewed.useQuery({
		excludeProductId,
		sessionId,
		limit: String(limit),
	}) as {
		data: { items: RecentlyViewedItem[] } | undefined;
		isLoading: boolean;
	};

	const items = data?.items ?? [];

	if (isLoading || items.length === 0) return null;

	return (
		<section className="border-border/50 border-t py-12 sm:py-14">
			<h2 className="mb-6 font-display font-semibold text-foreground text-lg tracking-tight sm:text-xl">
				{title}
			</h2>
			<div className="scrollbar-none flex gap-4 overflow-x-auto pb-2">
				{items.map((item) => (
					<Link
						key={item.productId}
						href={`/products/${item.slug}`}
						className="group flex w-36 flex-none flex-col sm:w-44"
					>
						<div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
							{item.image ? (
								<img
									src={item.image}
									alt={item.name}
									className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<rect width="18" height="18" x="3" y="3" rx="2" />
										<circle cx="9" cy="9" r="2" />
										<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
									</svg>
								</div>
							)}
						</div>
						<div className="mt-2.5">
							<p className="truncate text-foreground text-sm transition-colors group-hover:text-foreground/80">
								{item.name}
							</p>
							<p className="mt-0.5 font-medium text-muted-foreground text-xs tabular-nums">
								{formatPrice(item.price)}
							</p>
						</div>
					</Link>
				))}
			</div>
		</section>
	);
}
