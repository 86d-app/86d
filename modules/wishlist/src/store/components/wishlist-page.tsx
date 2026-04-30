"use client";

import { useState } from "react";
import { useWishlistApi } from "./_hooks";
import { extractError, formatDate } from "./_utils";
import { HeartIcon } from "./heart-icon";
import WishlistPageTemplate from "./wishlist-page.mdx";

interface WishlistItem {
	id: string;
	customerId: string;
	productId: string;
	productName: string;
	productImage?: string | undefined;
	note?: string | undefined;
	addedAt: string;
}

export function WishlistPage({
	customerId,
}: {
	customerId?: string | undefined;
}) {
	const api = useWishlistApi();
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [error, setError] = useState("");

	const {
		data,
		isLoading: loading,
		isError: queryError,
		refetch,
	} = customerId
		? (api.listWishlist.useQuery({}) as {
				data: { items: WishlistItem[]; total: number } | undefined;
				isLoading: boolean;
				isError: boolean;
				refetch: () => void;
			})
		: { data: undefined, isLoading: false, isError: false, refetch: () => {} };

	const items = data?.items ?? [];

	const removeMutation = api.removeFromWishlist.useMutation({
		onSettled: () => {
			setRemovingId(null);
			void api.listWishlist.invalidate();
			void api.checkWishlist.invalidate();
		},
		onError: (err: Error) => {
			setError(extractError(err, "Failed to remove item."));
		},
	});

	const handleRemove = (id: string) => {
		setRemovingId(id);
		setError("");
		removeMutation.mutate({ params: { id } });
	};

	if (!customerId) {
		return (
			<div className="py-16 text-center">
				<HeartIcon filled={false} large />
				<h2 className="mt-4 font-semibold text-gray-900 text-lg dark:text-gray-100">
					Your Wishlist
				</h2>
				<p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
					Sign in to start saving your favorite items.
				</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={`skel-${i}`}
						className="overflow-hidden rounded-lg border border-border"
					>
						<div className="h-48 w-full animate-pulse bg-muted" />
						<div className="space-y-2 p-4">
							<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
							<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (queryError) {
		return (
			<div className="py-16 text-center" role="alert">
				<HeartIcon filled={false} large />
				<h2 className="mt-4 font-semibold text-foreground text-lg">
					Failed to load wishlist
				</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					Something went wrong. Please try again.
				</p>
				<button
					type="button"
					onClick={() => refetch()}
					className="mt-4 rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm transition-colors hover:bg-foreground/90"
				>
					Try again
				</button>
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="py-16 text-center">
				<HeartIcon filled={false} large />
				<h2 className="mt-4 font-semibold text-gray-900 text-lg dark:text-gray-100">
					Your wishlist is empty
				</h2>
				<p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
					Browse products and tap the heart to save items for later.
				</p>
			</div>
		);
	}

	const itemsContent = (
		<>
			{items.map((item) => (
				<div
					key={item.id}
					className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
				>
					{item.productImage ? (
						<div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
							<img
								src={item.productImage}
								alt={item.productName}
								className="h-full w-full object-cover transition-transform group-hover:scale-105"
							/>
						</div>
					) : (
						<div className="flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-800">
							<span className="text-3xl text-gray-300 dark:text-gray-600">
								&#128722;
							</span>
						</div>
					)}
					<div className="p-4">
						<h3 className="font-medium text-gray-900 text-sm dark:text-gray-100">
							{item.productName}
						</h3>
						{item.note && (
							<p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
								{item.note}
							</p>
						)}
						<div className="mt-2 flex items-center justify-between">
							<span className="text-gray-400 text-xs dark:text-gray-500">
								Added {formatDate(item.addedAt)}
							</span>
							<button
								type="button"
								onClick={() => handleRemove(item.id)}
								disabled={removingId === item.id}
								className="text-gray-400 text-xs transition-colors hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
							>
								{removingId === item.id ? "Removing..." : "Remove"}
							</button>
						</div>
					</div>
				</div>
			))}
		</>
	);

	return (
		<WishlistPageTemplate
			itemCount={items.length}
			error={error}
			itemsContent={itemsContent}
		/>
	);
}
