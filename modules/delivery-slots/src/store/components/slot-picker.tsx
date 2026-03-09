"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import SlotPickerTemplate from "./slot-picker.mdx";

interface SlotItem {
	schedule: {
		id: string;
		name: string;
		startTime: string;
		endTime: string;
		surchargeInCents: number;
	};
	date: string;
	booked: number;
	remaining: number;
	available: boolean;
}

function useDeliverySlotsStoreApi() {
	const client = useModuleClient();
	return {
		available:
			client.module("delivery-slots").store["/delivery-slots/available"],
	};
}

export function SlotPicker() {
	const api = useDeliverySlotsStoreApi();
	const today = new Date().toISOString().slice(0, 10);
	const [selectedDate, setSelectedDate] = useState(today);

	const { data, isLoading: loading } = api.available.useQuery({
		date: selectedDate,
	}) as {
		data: { slots: SlotItem[] } | undefined;
		isLoading: boolean;
	};

	const slots = data?.slots ?? [];

	return (
		<SlotPickerTemplate
			slots={slots}
			loading={loading}
			selectedDate={selectedDate}
			onDateChange={setSelectedDate}
		/>
	);
}
