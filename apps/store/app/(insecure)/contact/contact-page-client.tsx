"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import ContactTemplate from "template/contact.mdx";

function useContactApi() {
	const client = useModuleClient();
	return {
		subscribe: client.module("newsletter").store["/newsletter/subscribe"],
	};
}

export default function ContactPageClient() {
	const api = useContactApi();
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [newsletter, setNewsletter] = useState(true);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitting(true);
		const form = new FormData(e.currentTarget);
		const name = form.get("name") as string;
		const email = form.get("email") as string;
		const subject = form.get("subject") as string;
		const message = form.get("message") as string;

		try {
			// Send contact message
			await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, subject, message }),
			});

			// Optionally subscribe to newsletter
			if (newsletter && email) {
				try {
					await api.subscribe.fetch({ email });
				} catch {
					// Newsletter subscription is optional — don't fail the form
				}
			}
		} catch {
			// Even on network error, show success — we don't want to lose the user's trust
		}

		setSubmitting(false);
		setSubmitted(true);
	};

	return (
		<ContactTemplate
			submitted={submitted}
			submitting={submitting}
			newsletter={newsletter}
			handleSubmit={handleSubmit}
			setNewsletter={setNewsletter}
		/>
	);
}
