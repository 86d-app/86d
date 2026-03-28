import { createAdminEndpoint } from "@86d-app/core";
import { DoordashDriveProvider } from "../../provider";

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 8)}${"*".repeat(Math.min(key.length - 8, 20))}`;
}

interface SettingsOptions {
	developerId?: string | undefined;
	keyId?: string | undefined;
	signingSecret?: string | undefined;
	sandbox?: boolean | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/doordash/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.developerId && options.keyId && options.signingSecret,
			);

			let status: "connected" | "not_configured" | "error" = "not_configured";
			let error: string | undefined;
			let accountName: string | undefined;

			if (hasCredentials) {
				const provider = new DoordashDriveProvider(
					{
						developerId: options.developerId ?? "",
						keyId: options.keyId ?? "",
						signingSecret: options.signingSecret ?? "",
					},
					options.sandbox ?? true,
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
				sandbox: options.sandbox ?? true,
				developerIdMasked: options.developerId
					? maskKey(options.developerId)
					: null,
				keyIdMasked: options.keyId ? maskKey(options.keyId) : null,
			};
		},
	);
}
