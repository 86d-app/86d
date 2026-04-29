"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useAppointmentsStoreApi() {
	const client = useModuleClient();
	return {
		listServices: client.module("appointments").store["/appointments/services"],
		getService:
			client.module("appointments").store["/appointments/services/:slug"],
		getAvailability:
			client.module("appointments").store["/appointments/availability"],
		book: client.module("appointments").store["/appointments/book"],
		getAppointment: client.module("appointments").store["/appointments/:id"],
		cancel: client.module("appointments").store["/appointments/:id/cancel"],
	};
}
