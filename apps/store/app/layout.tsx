import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Inter, Zalando_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import { Toaster } from "ui/core/sonner";
import "./globals.css";
import { GoogleTagManager } from "@next/third-parties/google";
import { StoreQueryProvider } from "components/providers";
import env from "env";
import { IBM_Plex_Mono, Merriweather } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { getBaseUrl } from "utils/url";
import { cn } from "~/lib/utils";
import { buildWebSiteJsonLd } from "../lib/seo";

export const metadata: Metadata = {
	metadataBase: new URL(getBaseUrl()),
	title: "86d — Dynamic Commerce Platform",
	description:
		"Sell now and sell out. Introducing the first dynamic commerce platform. Maintain your online presence with agentic assistance.",
	openGraph: {
		title: "86d — Dynamic Commerce Platform",
		description:
			"Sell now and sell out. Introducing the first dynamic commerce platform. Maintain your online presence with agentic assistance.",
		url: getBaseUrl(),
		siteName: "86d",
		images: "/opengraph-image",
	},
	alternates: {
		canonical: getBaseUrl(),
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};

const display = Zalando_Sans({
	subsets: ["latin"],
	variable: "--font-display",
	weight: ["400", "700", "900"],
	style: ["normal", "italic"],
	adjustFontFallback: false,
});

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
	weight: ["400", "500", "700", "800", "900"],
});

const merriweather = Merriweather({
	subsets: ["latin"],
	variable: "--font-serif",
	weight: ["400", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	weight: ["400", "600"],
});

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const cookieStore = await cookies();
	const themeCookie = cookieStore.get("theme");
	const initialTheme = (themeCookie?.value as "light" | "dark") || "system";

	const webSiteJsonLd = buildWebSiteJsonLd();

	return (
		<html
			lang="en"
			className={cn(
				merriweather.variable,
				ibmPlexMono.variable,
				display.variable,
				"font-sans",
				inter.variable,
			)}
		>
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(webSiteJsonLd),
					}}
				/>
				{env.NODE_ENV === "development" && (
					<script
						crossOrigin="anonymous"
						src="//unpkg.com/react-scan/dist/auto.global.js"
					/>
				)}
			</head>
			{env.NODE_ENV === "production" &&
				env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID && (
					<GoogleTagManager gtmId={env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID} />
				)}
			<body className="min-h-screen bg-background text-foreground antialiased">
				<Analytics />
				<NuqsAdapter>
					<StoreQueryProvider>
						<ThemeProvider
							attribute="class"
							defaultTheme={initialTheme}
							enableSystem
						>
							{children}
							<Toaster />
						</ThemeProvider>
					</StoreQueryProvider>
				</NuqsAdapter>
			</body>
		</html>
	);
}
