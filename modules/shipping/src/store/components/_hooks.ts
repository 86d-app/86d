"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useShippingApi() {
	const client = useModuleClient();
	return {
		calculateRates: client.module("shipping").store["/shipping/calculate"],
	};
}
