"use client";

import { useBundleApi } from "./_hooks";
import { formatDiscount } from "./_utils";
import BundleDetailTemplate from "./bundle-detail.mdx";

interface BundleItem {
	id: string;
	productId: string;
	variantId?: string;
	quantity: number;
}

interface Bundle {
	id: string;
	name: string;
	slug: string;
	description?: string;
	discountType: "fixed" | "percentage";
	discountValue: number;
	imageUrl?: string;
	items: BundleItem[];
}

export function BundleDetail({ slug }: { slug: string }) {
	const api = useBundleApi();
	const { data, isLoading } = api.get.useQuery({
		params: { slug },
	}) as {
		data: { bundle: Bundle } | undefined;
		isLoading: boolean;
	};

	const bundle = data?.bundle;

	return (
		<BundleDetailTemplate
			bundle={bundle}
			loading={isLoading}
			formatDiscount={formatDiscount}
		/>
	);
}
