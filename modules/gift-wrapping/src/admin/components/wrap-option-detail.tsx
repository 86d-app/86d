"use client";

import { useModuleClient } from "@86d-app/core/client";
import WrapOptionDetailTemplate from "./wrap-option-detail.mdx";

interface WrapOptionData {
	id: string;
	name: string;
	description?: string;
	priceInCents: number;
	imageUrl?: string;
	active: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

function useGiftWrappingApi(id: string) {
	const client = useModuleClient();
	return {
		detail: client.module("gift-wrapping").admin["/admin/gift-wrapping/:id"],
		id,
	};
}

export function WrapOptionDetail({ id }: { id: string }) {
	const api = useGiftWrappingApi(id);

	const { data, isLoading: loading } = api.detail.useQuery({
		id: api.id,
	}) as {
		data: { option: WrapOptionData } | undefined;
		isLoading: boolean;
	};

	const option = data?.option;

	return <WrapOptionDetailTemplate option={option} loading={loading} />;
}
