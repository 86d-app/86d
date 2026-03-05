import type { Metadata } from "next";
import { getStoreName } from "~/lib/seo";
import ContactPageClient from "./contact-page-client";

const storeName = getStoreName();

export const metadata: Metadata = {
	title: `Contact — ${storeName}`,
	description: "Get in touch with us. We'd love to hear from you.",
};

export default function ContactPage() {
	return <ContactPageClient />;
}
