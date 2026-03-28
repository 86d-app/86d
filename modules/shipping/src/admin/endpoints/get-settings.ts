import { createAdminEndpoint } from "@86d-app/core";
import { EasyPostProvider } from "../../provider";

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 8)}${"*".repeat(Math.min(key.length - 8, 20))}`;
}

interface SettingsOptions {
	easypostApiKey?: string | undefined;
	easypostTestMode?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/shipping/settings",
		{ method: "GET" },
		async () => {
			const apiKey = options.easypostApiKey ?? "";
			const hasCredentials = apiKey.length > 0;

			let status: "connected" | "not_configured" | "error" = "not_configured";
			let error: string | undefined;
			let accountName: string | undefined;

			if (hasCredentials) {
				const provider = new EasyPostProvider(
					apiKey,
					options.easypostTestMode ?? true,
				);
				const result = await provider.verifyConnection();
				if (result.ok) {
					status = "connected";
					accountName = result.accountName;
				} else {
					status = "error";
					error = result.error;
				}
			}

			return {
				status,
				error,
				accountName,
				configured: hasCredentials,
				testMode: options.easypostTestMode ?? true,
				apiKeyMasked: hasCredentials ? maskKey(apiKey) : null,
			};
		},
	);
}
