"use client";

import { useModuleClient } from "@86d-app/core/client";
import BlackoutListTemplate from "./blackout-list.mdx";

interface BlackoutItem {
	id: string;
	date: string;
	reason?: string;
	createdAt: string;
}

function useBlackoutsApi() {
	const client = useModuleClient();
	return {
		list: client.module("delivery-slots").admin[
			"/admin/delivery-slots/blackouts"
		],
	};
}

export function BlackoutList() {
	const api = useBlackoutsApi();

	const { data, isLoading: loading } = api.list.useQuery({}) as {
		data: { blackouts: BlackoutItem[] } | undefined;
		isLoading: boolean;
	};

	const blackouts = data?.blackouts ?? [];

	return <BlackoutListTemplate blackouts={blackouts} loading={loading} />;
}
