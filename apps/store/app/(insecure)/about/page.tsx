import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const storeName = await getStoreName();
	return {
		title: `About — ${storeName}`,
		description:
			"Learn about our story, mission, and commitment to quality products.",
	};
}

export { default } from "../about-page-client";
