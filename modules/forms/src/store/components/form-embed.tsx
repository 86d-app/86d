"use client";

import { type FormEvent, useState } from "react";
import type { FormField } from "../../service";
import { useFormsApi } from "./_hooks";
import FormEmbedTemplate from "./form-embed.mdx";

interface FormData {
	id: string;
	name: string;
	slug: string;
	description?: string | undefined;
	fields: FormField[];
	submitLabel: string;
	successMessage: string;
	isActive: boolean;
	honeypotEnabled: boolean;
}

export function FormEmbed({ slug }: { slug: string }) {
	const api = useFormsApi();
	const [values, setValues] = useState<Record<string, string | boolean>>({});
	const [submitted, setSubmitted] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [honeypot, setHoneypot] = useState("");

	const { data, isLoading } = api.getForm.useQuery({ slug }) as {
		data: { form: FormData | null } | undefined;
		isLoading: boolean;
	};

	const submitMutation = api.submitForm.useMutation({
		onSuccess: (result: { success: boolean; message: string }) => {
			if (result.success) {
				setSubmitted(true);
				setSuccessMessage(result.message);
				setSubmitError(null);
			}
		},
		onError: (error: Error) => {
			setSubmitError(error.message || "Failed to submit form");
		},
	});

	const handleChange = (name: string, value: string | boolean) => {
		setValues((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setSubmitError(null);

		const form = data?.form;
		if (!form) return;

		const submissionValues: Record<string, unknown> = {};
		for (const field of form.fields) {
			const val = values[field.name];
			if (field.type === "checkbox") {
				submissionValues[field.name] = val === true || val === "true";
			} else if (field.type === "number" && typeof val === "string" && val) {
				submissionValues[field.name] = Number(val);
			} else {
				submissionValues[field.name] = val ?? "";
			}
		}

		submitMutation.mutate({
			slug: form.slug,
			values: submissionValues,
			...(form.honeypotEnabled ? { _hp: honeypot } : {}),
		});
	};

	if (isLoading) return null;

	const form = data?.form;
	if (!form) return null;

	const sortedFields = [...form.fields].sort((a, b) => a.position - b.position);

	return (
		<FormEmbedTemplate
			form={form}
			fields={sortedFields}
			values={values}
			submitted={submitted}
			successMessage={successMessage}
			submitError={submitError}
			isPending={submitMutation.isPending}
			honeypotEnabled={form.honeypotEnabled}
			honeypotValue={honeypot}
			onChange={handleChange}
			onHoneypotChange={setHoneypot}
			onSubmit={handleSubmit}
		/>
	);
}
