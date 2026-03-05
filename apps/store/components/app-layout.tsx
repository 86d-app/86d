"use client";

import { PageViewTracker } from "components/analytics-tracker";
import { useTheme } from "next-themes";
import config from "template/config.json";
import Layout from "template/layout.mdx";
import type { Config } from "~/config";

export function AppLayout({ children }: { children: React.ReactNode }) {
	const theme = useTheme();
	return (
		<Layout config={config as Config} theme={theme}>
			<PageViewTracker />
			{children}
		</Layout>
	);
}
