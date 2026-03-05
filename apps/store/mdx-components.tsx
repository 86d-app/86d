import type { MDXComponents } from "mdx/types";
import uiComponents from "ui";
import appComponents from "~/components";
import { components as moduleComponents } from "./generated/components";

export function useMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...uiComponents,
		...appComponents,
		...moduleComponents,
		...components,
	};
}
