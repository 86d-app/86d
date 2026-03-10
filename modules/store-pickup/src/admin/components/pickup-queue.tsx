"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import PickupQueueTemplate from "./pickup-queue.mdx";

const PAGE_SIZE = 50;

interface PickupItem {
	id: string;
	locationName: string;
	locationAddress: string;
	orderId: string;
	scheduledDate: string;
	startTime: string;
	endTime: string;
	status: string;
	notes?: string;
	createdAt: string;
}

function usePickupQueueApi() {
	const client = useModuleClient();
	return {
		list: client.module("store-pickup").admin["/admin/store-pickup/pickups"],
	};
}

export function PickupQueue() {
	const api = usePickupQueueApi();
	const [statusFilter, setStatusFilter] = useState("");

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
	};
	if (statusFilter) queryInput.status = statusFilter;

	const { data, isLoading: loading } = api.list.useQuery(queryInput) as {
		data: { pickups: PickupItem[] } | undefined;
		isLoading: boolean;
	};

	const pickups = data?.pickups ?? [];

	return (
		<PickupQueueTemplate
			pickups={pickups}
			loading={loading}
			statusFilter={statusFilter}
			onStatusChange={setStatusFilter}
		/>
	);
}
