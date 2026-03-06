import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const storeName = await getStoreName();
	return {
		title: `Collections — ${storeName}`,
		description: `Browse our curated collections at ${storeName}. Find the perfect products for every occasion.`,
	};
}

export { default } from "./collections-page-client";
