"use client";

import type { MDXComponents } from "mdx/types";
import { MyPreorders } from "./my-preorders";
import { PreorderButton } from "./preorder-button";

export { MyPreorders, PreorderButton };

export default {
	MyPreorders,
	PreorderButton,
} satisfies MDXComponents;
