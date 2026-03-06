import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const storeName = await getStoreName();
	return {
		title: `Gift Cards — ${storeName}`,
		description: `Give the perfect gift. ${storeName} gift cards let recipients choose exactly what they want.`,
	};
}

export { default } from "./gift-cards-page-client";
