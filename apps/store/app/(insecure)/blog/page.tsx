import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";
import BlogPageClient from "./blog-page-client";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Blog — ${storeName}`,
	description: "Stories, updates, and insights from our team.",
};

export default function BlogPage() {
	return <BlogPageClient />;
}
