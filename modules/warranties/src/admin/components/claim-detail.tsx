"use client";

import { useModuleClient } from "@86d-app/core/client";
import ClaimDetailTemplate from "./claim-detail.mdx";

interface ClaimData {
	id: string;
	warrantyRegistrationId: string;
	customerId: string;
	issueType: string;
	issueDescription: string;
	status: string;
	resolution?: string;
	resolutionNotes?: string;
	adminNotes?: string;
	submittedAt: string;
	resolvedAt?: string;
}

function useClaimApi() {
	const client = useModuleClient();
	return {
		getClaim: client.module("warranties").admin["/admin/warranties/claims/:id"],
		approve:
			client.module("warranties").admin["/admin/warranties/claims/:id/approve"],
		deny: client.module("warranties").admin[
			"/admin/warranties/claims/:id/deny"
		],
		review:
			client.module("warranties").admin["/admin/warranties/claims/:id/review"],
		repair:
			client.module("warranties").admin["/admin/warranties/claims/:id/repair"],
		resolve:
			client.module("warranties").admin["/admin/warranties/claims/:id/resolve"],
		close:
			client.module("warranties").admin["/admin/warranties/claims/:id/close"],
	};
}

export function ClaimDetail({ claimId }: { claimId: string }) {
	const api = useClaimApi();

	const { data, isLoading: loading } = api.getClaim.useQuery({
		id: claimId,
	}) as {
		data: { claim: ClaimData } | undefined;
		isLoading: boolean;
	};

	const claim = data?.claim;

	return <ClaimDetailTemplate claim={claim} loading={loading} />;
}
