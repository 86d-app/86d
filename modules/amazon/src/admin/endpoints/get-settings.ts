import { createAdminEndpoint } from "@86d-app/core";

interface SettingsOptions {
	sellerId?: string | undefined;
	clientId?: string | undefined;
	clientSecret?: string | undefined;
	refreshToken?: string | undefined;
	marketplaceId?: string | undefined;
	region?: string | undefined;
}

export function createGetSettingsEndpoint(options: SettingsOptions) {
	return createAdminEndpoint(
		"/admin/amazon/settings",
		{ method: "GET" },
		async () => {
			const hasCredentials = Boolean(
				options.sellerId &&
					options.clientId &&
					options.clientSecret &&
					options.refreshToken,
			);
			return {
				configured: hasCredentials,
				sellerId: options.sellerId ?? null,
				marketplaceId: options.marketplaceId ?? null,
				region: options.region ?? "NA",
				clientId: options.clientId
					? `${options.clientId.slice(0, 12)}...`
					: null,
			};
		},
	);
}
