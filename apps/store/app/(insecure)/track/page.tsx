import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Track Order — ${storeName}`,
	description: `Track your order status at ${storeName}. Enter your order number and email to check the delivery status.`,
};

export { default } from "./track-page-client";
