"use client";

import { useModuleClient } from "@86d-app/core/client";
import AnalyticsSettingsTemplate from "./analytics-settings.mdx";

interface ProviderStatus {
	configured: boolean;
	provider: string;
	containerId?: string | null;
	dsn?: string | null;
}

interface SettingsData {
	gtm: ProviderStatus;
	sentry: ProviderStatus;
}

function useAnalyticsSettingsApi() {
	const client = useModuleClient();
	return {
		settings: client.module("analytics").admin["/admin/analytics/settings"],
	};
}

export function AnalyticsSettings() {
	const api = useAnalyticsSettingsApi();
	const { data, isLoading, error } = api.settings.useQuery({}) as {
		data: SettingsData | undefined;
		isLoading: boolean;
		error: Error | null;
	};

	return (
		<AnalyticsSettingsTemplate
			data={data ?? null}
			isLoading={isLoading}
			error={error?.message ?? null}
		/>
	);
}
