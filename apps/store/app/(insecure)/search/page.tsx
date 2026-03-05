import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Search — ${storeName}`,
	description: `Search products at ${storeName}. Find exactly what you're looking for.`,
};

export { default } from "./search-page-client";
