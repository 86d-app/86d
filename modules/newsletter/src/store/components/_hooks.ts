"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useNewsletterApi() {
	const client = useModuleClient();
	return {
		subscribe: client.module("newsletter").store["/newsletter/subscribe"],
		unsubscribe: client.module("newsletter").store["/newsletter/unsubscribe"],
	};
}
