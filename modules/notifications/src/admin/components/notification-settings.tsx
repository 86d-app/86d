"use client";

import { useModuleClient } from "@86d-app/core/client";
import NotificationSettingsTemplate from "./notification-settings.mdx";

interface ProviderStatus {
	configured: boolean;
	provider: string;
	fromAddress?: string | null;
	fromNumber?: string | null;
	apiKey?: string | null;
	accountSid?: string | null;
}

interface SettingsData {
	email: ProviderStatus;
	sms: ProviderStatus;
}

function useNotificationsSettingsApi() {
	const client = useModuleClient();
	return {
		settings:
			client.module("notifications").admin["/admin/notifications/settings"],
	};
}

export function NotificationSettings() {
	const api = useNotificationsSettingsApi();
	const { data, isLoading, error } = api.settings.useQuery({}) as {
		data: SettingsData | undefined;
		isLoading: boolean;
		error: Error | null;
	};

	return (
		<NotificationSettingsTemplate
			data={data ?? null}
			isLoading={isLoading}
			error={error?.message ?? null}
		/>
	);
}
