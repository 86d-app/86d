"use client";

import { useFormsApi } from "./_hooks";
import FormListTemplate from "./form-list.mdx";

interface FormSummary {
	id: string;
	name: string;
	slug: string;
	description?: string | undefined;
}

export function FormList({ title }: { title?: string | undefined }) {
	const api = useFormsApi();
	const { data, isLoading } = api.listForms.useQuery({}) as {
		data: { forms: FormSummary[] } | undefined;
		isLoading: boolean;
	};

	if (isLoading) return null;

	const forms = data?.forms ?? [];
	if (forms.length === 0) return null;

	return <FormListTemplate title={title ?? "Forms"} forms={forms} />;
}
