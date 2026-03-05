import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Gift Cards — ${storeName}`,
	description: `Give the perfect gift. ${storeName} gift cards let recipients choose exactly what they want.`,
};

export { default } from "./gift-cards-page-client";
