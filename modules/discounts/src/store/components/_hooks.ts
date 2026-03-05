"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useDiscountsApi() {
	const client = useModuleClient();
	return {
		validate: client.module("discounts").store["/discounts/validate"],
	};
}
