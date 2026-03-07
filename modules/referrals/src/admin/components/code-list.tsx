"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import CodeListTemplate from "./code-list.mdx";

interface ReferralCodeItem {
	id: string;
	customerId: string;
	code: string;
	active: boolean;
	usageCount: number;
	maxUses: number;
	expiresAt?: string | null;
	createdAt: string;
}

function useCodesAdminApi() {
	const client = useModuleClient();
	return {
		list: client.module("referrals").admin["/admin/referrals/codes"],
		deactivate:
			client.module("referrals").admin["/admin/referrals/codes/:id/deactivate"],
	};
}

export function CodeList() {
	const api = useCodesAdminApi();
	const [page, setPage] = useState(1);
	const [activeFilter, setActiveFilter] = useState("");

	const queryInput = {
		page,
		limit: 25,
		...(activeFilter ? { active: activeFilter } : {}),
	};

	const { data, isLoading: loading } = api.list.useQuery(queryInput) as {
		data: { codes: ReferralCodeItem[]; total: number } | undefined;
		isLoading: boolean;
	};

	const deactivateMutation = api.deactivate.useMutation({
		onSuccess: () => void api.list.invalidate(),
	});

	const codes = data?.codes ?? [];

	return (
		<CodeListTemplate
			codes={codes}
			loading={loading}
			page={page}
			onPageChange={setPage}
			activeFilter={activeFilter}
			onActiveFilterChange={setActiveFilter}
			onDeactivate={(id: string) => deactivateMutation.mutate({ id })}
		/>
	);
}
