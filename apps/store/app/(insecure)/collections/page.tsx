import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Collections — ${storeName}`,
	description: `Browse our curated collections at ${storeName}. Find the perfect products for every occasion.`,
};

export { default } from "./collections-page-client";
