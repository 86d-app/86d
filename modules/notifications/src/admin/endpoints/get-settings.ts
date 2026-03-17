import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	resendApiKey?: string | undefined;
	resendFromAddress?: string | undefined;
	twilioAccountSid?: string | undefined;
	twilioFromNumber?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/notifications/settings",
		{ method: "GET" },
		async () => {
			const emailConfigured = Boolean(
				options.resendApiKey && options.resendFromAddress,
			);
			const smsConfigured = Boolean(
				options.twilioAccountSid && options.twilioFromNumber,
			);
			return {
				email: {
					configured: emailConfigured,
					provider: "resend",
					fromAddress: options.resendFromAddress ?? null,
					apiKey: options.resendApiKey
						? `${options.resendApiKey.slice(0, 8)}...`
						: null,
				},
				sms: {
					configured: smsConfigured,
					provider: "twilio",
					fromNumber: options.twilioFromNumber ?? null,
					accountSid: options.twilioAccountSid
						? `${options.twilioAccountSid.slice(0, 8)}...`
						: null,
				},
			};
		},
	);
}
