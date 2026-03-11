"use client";

import { useState } from "react";
import { useWishlistApi } from "./_hooks";
import { extractError } from "./_utils";
import { HeartIcon } from "./heart-icon";
import WishlistButtonTemplate from "./wishlist-button.mdx";

export function WishlistButton({
	productId,
	productName,
	productImage,
	customerId,
}: {
	productId: string;
	productName: string;
	productImage?: string | undefined;
	customerId?: string | undefined;
}) {
	const api = useWishlistApi();
	const [error, setError] = useState("");

	const { data: checkData, isLoading: checking } = customerId
		? (api.checkWishlist.useQuery({
				params: { productId },
			}) as {
				data: { inWishlist: boolean } | undefined;
				isLoading: boolean;
			})
		: { data: undefined, isLoading: false };

	const inWishlist = checkData?.inWishlist ?? false;

	const addMutation = api.addToWishlist.useMutation({
		onSettled: () => {
			void api.checkWishlist.invalidate();
			void api.listWishlist.invalidate();
		},
		onError: (err: Error) => {
			setError(extractError(err, "Failed to add to wishlist."));
		},
	});

	const handleToggle = () => {
		if (!customerId) return;
		setError("");
		if (inWishlist) return;
		addMutation.mutate({
			productId,
			productName,
			productImage,
		});
	};

	if (!customerId) {
		return (
			<button
				type="button"
				className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-400 text-sm dark:border-gray-700"
				disabled
				title="Sign in to save items"
			>
				<HeartIcon filled={false} />
				Save
			</button>
		);
	}

	return (
		<WishlistButtonTemplate
			onClick={handleToggle}
			disabled={checking || addMutation.isPending}
			buttonClass={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium text-sm transition-colors ${
				inWishlist
					? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
					: "border-gray-200 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400"
			}`}
			heartIcon={<HeartIcon filled={inWishlist} />}
			label={inWishlist ? "Saved" : "Save"}
			error={error}
		/>
	);
}
