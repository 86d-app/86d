"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useTaxApi() {
	const client = useModuleClient();
	return {
		calculateTax: client.module("tax").store["/tax/calculate"],
		getApplicableRates: client.module("tax").store["/tax/rates"],
	};
}
