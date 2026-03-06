import { createAdminEndpoint } from "@86d-app/core";

function maskKey(key: string): string {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
}

function str(val: unknown): string {
	return typeof val === "string" ? val : "";
}

export const getSettings = createAdminEndpoint(
	"/admin/braintree/settings",
	{ method: "GET" },
	async (ctx) => {
		// Module options are flat key-value pairs at runtime
		const opts = ctx.context.options as Record<string, unknown>;
		const merchantId = str(opts.merchantId);
		const publicKey = str(opts.publicKey);
		const privateKey = str(opts.privateKey);
		const sandbox = str(opts.sandbox);

		return {
			configured:
				merchantId.length > 0 && publicKey.length > 0 && privateKey.length > 0,
			merchantIdMasked: merchantId ? maskKey(merchantId) : null,
			publicKeyMasked: publicKey ? maskKey(publicKey) : null,
			privateKeyMasked: privateKey ? maskKey(privateKey) : null,
			mode:
				sandbox === "true" || sandbox === "1"
					? ("sandbox" as const)
					: ("production" as const),
		};
	},
);
