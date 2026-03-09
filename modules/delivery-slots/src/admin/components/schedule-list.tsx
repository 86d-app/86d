"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import ScheduleListTemplate from "./schedule-list.mdx";

const PAGE_SIZE = 50;

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
}

interface SummaryData {
	totalSchedules: number;
	activeSchedules: number;
	totalBookings: number;
	confirmedBookings: number;
	cancelledBookings: number;
	totalSurchargeRevenue: number;
	blackoutDates: number;
}

function useDeliverySlotsApi() {
	const client = useModuleClient();
	return {
		list: client.module("delivery-slots").admin["/admin/delivery-slots"],
		summary:
			client.module("delivery-slots").admin["/admin/delivery-slots/summary"],
	};
}

export function ScheduleList() {
	const api = useDeliverySlotsApi();
	const [activeFilter, setActiveFilter] = useState("");

	const queryInput: Record<string, string> = {
		take: String(PAGE_SIZE),
	};
	if (activeFilter) queryInput.active = activeFilter;

	const { data: listData, isLoading: loading } = api.list.useQuery(
		queryInput,
	) as {
		data: { schedules: ScheduleItem[] } | undefined;
		isLoading: boolean;
	};

	const { data: summaryData } = api.summary.useQuery({}) as {
		data: { summary: SummaryData } | undefined;
	};

	const schedules = listData?.schedules ?? [];
	const summaryInfo = summaryData?.summary;

	return (
		<ScheduleListTemplate
			schedules={schedules}
			summary={summaryInfo}
			loading={loading}
			activeFilter={activeFilter}
			onActiveChange={setActiveFilter}
			dayNames={DAY_NAMES}
		/>
	);
}
