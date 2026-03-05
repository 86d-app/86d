import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `About — ${storeName}`,
	description:
		"Learn about our story, mission, and commitment to quality products.",
};

export { default } from "../about-page-client";
