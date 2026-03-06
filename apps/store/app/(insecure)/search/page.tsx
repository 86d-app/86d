import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const storeName = await getStoreName();
	return {
		title: `Search — ${storeName}`,
		description: `Search products at ${storeName}. Find exactly what you're looking for.`,
	};
}

export { default } from "./search-page-client";
