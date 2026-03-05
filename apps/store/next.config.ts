import createMDX from "@next/mdx";
import env from "env";
import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const securityHeaders = [
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{
		key: "Referrer-Policy",
		value: "strict-origin-when-cross-origin",
	},
	{ key: "X-DNS-Prefetch-Control", value: "on" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=()",
	},
	// Report-only CSP: violations are reported, not blocked. Tighten to enforce once policy is stable.
	{
		key: "Content-Security-Policy-Report-Only",
		value:
			"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
	},
];

const withMDX = createMDX({});

export default withMDX({
	pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
	transpilePackages: [
		"@86d-app/blog",
		"@86d-app/cart",
		"@86d-app/digital-downloads",
		"@86d-app/discounts",
		"@86d-app/gift-cards",
		"@86d-app/newsletter",
		"@86d-app/orders",
		"@86d-app/products",
		"@86d-app/reviews",
		"@86d-app/subscriptions",
		"@86d-app/tax",
		"@86d-app/wishlist",
	],
	turbopack: {
		rules: {
			"*.txt": {
				loaders: ["raw-loader"],
				as: "*.js",
			},
		},
	},
	images: {
		remotePatterns: [
			...(env.VERCEL_BLOB_STORAGE_HOSTNAME
				? [
						{
							protocol: "https",
							hostname: env.VERCEL_BLOB_STORAGE_HOSTNAME,
						} satisfies RemotePattern,
					]
				: []),
		],
	},
	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }];
	},
} satisfies NextConfig);
