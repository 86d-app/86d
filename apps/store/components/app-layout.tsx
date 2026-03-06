"use client";

import type { Config } from "@86d-app/sdk";
import { PageViewTracker } from "components/analytics-tracker";
import { AppStateProvider } from "hooks/use-app";
import { useTheme } from "next-themes";
import Layout from "template/layout.mdx";

export function AppLayout({
	children,
	config,
}: {
	children: React.ReactNode;
	config: Config;
}) {
	const theme = useTheme();
	return (
		<AppStateProvider config={config}>
			<Layout config={config} theme={theme}>
				<PageViewTracker />
				{children}
			</Layout>
		</AppStateProvider>
	);
}
