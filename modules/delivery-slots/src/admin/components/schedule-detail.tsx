"use client";

import { useModuleClient } from "@86d-app/core/client";
import ScheduleDetailTemplate from "./schedule-detail.mdx";

const DAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

interface ScheduleItem {
	id: string;
	name: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
	capacity: number;
	surchargeInCents: number;
	active: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

function useScheduleDetail(id: string) {
	const client = useModuleClient();
	const api =
		client.module("delivery-slots").admin["/admin/delivery-slots/:id"];
	return api.useQuery({ id }) as {
		data: { schedule: ScheduleItem } | undefined;
		isLoading: boolean;
	};
}

export function ScheduleDetail({ id }: { id: string }) {
	const { data, isLoading: loading } = useScheduleDetail(id);
	const schedule = data?.schedule;

	return (
		<ScheduleDetailTemplate
			schedule={schedule}
			loading={loading}
			dayNames={DAY_NAMES}
		/>
	);
}
