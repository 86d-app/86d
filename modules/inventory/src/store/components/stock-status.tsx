"use client";

import { useInventoryApi } from "./_hooks";
import StockStatusTemplate from "./stock-status.mdx";

interface StockCheckResponse {
	inStock: boolean;
	available: number | null;
	allowBackorder: boolean;
}

export function StockStatus({
	productId,
	variantId,
}: {
	productId: string;
	variantId?: string | undefined;
}) {
	const api = useInventoryApi();

	const { data, isLoading } = api.checkStock.useQuery({
		productId,
		...(variantId ? { variantId } : {}),
	}) as {
		data: StockCheckResponse | undefined;
		isLoading: boolean;
	};

	if (isLoading || !data) return null;

	let status: "in-stock" | "low-stock" | "out-of-stock" | "backorder";
	if (data.inStock) {
		status =
			data.available !== null && data.available <= 5 ? "low-stock" : "in-stock";
	} else {
		status = data.allowBackorder ? "backorder" : "out-of-stock";
	}

	return <StockStatusTemplate status={status} />;
}
