import type { MDXComponents } from "mdx/types";
import appComponents from "~/components";
import uiComponents from "~/components/ui";
import { components as moduleComponents } from "./generated/components";

export function useMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...uiComponents,
		...appComponents,
		...moduleComponents,
		...components,
	};
}
