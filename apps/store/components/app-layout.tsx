"use client";

import type { Config } from "@86d-app/sdk";
import { PageViewTracker } from "components/analytics-tracker";
import { AppStateProvider } from "hooks/use-app";
import { useTheme } from "next-themes";
import Layout from "template/layout.mdx";
import { useMDXComponents } from "~/mdx-components";

export function AppLayout({
	children,
	config,
}: {
	children: React.ReactNode;
	config: Config;
}) {
	const theme = useTheme();
	// Pass components explicitly — MDX reads from React Context via @mdx-js/react's
	// useMDXComponents(), but there is no MDXProvider in the tree. Passing components
	// as a prop merges them directly in the compiled MDX: {...useMDXComponents(), ...props.components}
	const components = useMDXComponents();
	return (
		<AppStateProvider config={config}>
			<Layout config={config} theme={theme} components={components}>
				<PageViewTracker />
				{children}
			</Layout>
		</AppStateProvider>
	);
}
