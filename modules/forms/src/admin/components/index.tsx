"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormField {
	name: string;
	label: string;
	type: string;
	required: boolean;
	placeholder?: string;
	defaultValue?: string;
	options?: string[];
	pattern?: string;
	min?: number;
	max?: number;
	position: number;
}

interface Form {
	id: string;
	name: string;
	slug: string;
	description?: string;
	fields: FormField[];
	submitLabel: string;
	successMessage: string;
	isActive: boolean;
	notifyEmail?: string;
	honeypotEnabled: boolean;
	maxSubmissions: number;
	createdAt: string;
	updatedAt: string;
}

interface FormSubmission {
	id: string;
	formId: string;
	values: Record<string, unknown>;
	ipAddress?: string;
	status: string;
	createdAt: string;
}

interface FormStats {
	totalForms: number;
	totalSubmissions: number;
	unreadCount: number;
	spamCount: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useFormsApi() {
	const client = useModuleClient();
	return {
		list: client.module("forms").admin["/admin/forms"],
		create: client.module("forms").admin["/admin/forms/create"],
		stats: client.module("forms").admin["/admin/forms/stats"],
		detail: client.module("forms").admin["/admin/forms/:id"],
		update: client.module("forms").admin["/admin/forms/:id/update"],
		deleteForm: client.module("forms").admin["/admin/forms/:id/delete"],
		submissions:
			client.module("forms").admin["/admin/forms/:formId/submissions"],
		updateStatus:
			client.module("forms").admin["/admin/forms/submissions/:id/status"],
		deleteSubmission:
			client.module("forms").admin["/admin/forms/submissions/:id/delete"],
		bulkDelete:
			client.module("forms").admin["/admin/forms/submissions/bulk-delete"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_TYPES = [
	"text",
	"email",
	"textarea",
	"number",
	"phone",
	"select",
	"radio",
	"checkbox",
	"date",
	"url",
	"hidden",
] as const;

const STATUS_COLORS: Record<string, string> = {
	unread: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	read: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	spam: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// FieldBuilder — reused by FormCreate and FormDetail
// ---------------------------------------------------------------------------

function FieldBuilder({
	fields,
	onChange,
}: {
	fields: FormField[];
	onChange: (fields: FormField[]) => void;
}) {
	const addField = () => {
		const pos = fields.length;
		onChange([
			...fields,
			{
				name: `field_${pos}`,
				label: `Field ${pos + 1}`,
				type: "text",
				required: false,
				position: pos,
			},
		]);
	};

	const updateField = (idx: number, patch: Partial<FormField>) => {
		const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
		onChange(next);
	};

	const removeField = (idx: number) => {
		onChange(
			fields.filter((_, i) => i !== idx).map((f, i) => ({ ...f, position: i })),
		);
	};

	const moveField = (idx: number, dir: -1 | 1) => {
		const next = [...fields];
		const target = idx + dir;
		if (target < 0 || target >= next.length) return;
		const tmp = next[idx];
		next[idx] = next[target];
		next[target] = tmp;
		onChange(next.map((f, i) => ({ ...f, position: i })));
	};

	return (
		<div className="space-y-3">
			{fields.map((field, idx) => (
				<div
					key={`field-${field.position}`}
					className="rounded-lg border border-border bg-muted/20 p-3"
				>
					<div className="mb-2 flex items-center justify-between gap-2">
						<span className="font-medium text-foreground text-xs">
							Field {idx + 1}
						</span>
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => moveField(idx, -1)}
								disabled={idx === 0}
								className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted disabled:opacity-30"
							>
								&uarr;
							</button>
							<button
								type="button"
								onClick={() => moveField(idx, 1)}
								disabled={idx === fields.length - 1}
								className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted disabled:opacity-30"
							>
								&darr;
							</button>
							<button
								type="button"
								onClick={() => removeField(idx)}
								className="rounded px-1.5 py-0.5 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								Remove
							</button>
						</div>
					</div>
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						<input
							type="text"
							value={field.label}
							onChange={(e) =>
								updateField(idx, {
									label: e.target.value,
									name: slugify(e.target.value) || field.name,
								})
							}
							placeholder="Label"
							className="rounded-md border border-border bg-background px-2 py-1 text-sm"
						/>
						<select
							value={field.type}
							onChange={(e) => updateField(idx, { type: e.target.value })}
							className="rounded-md border border-border bg-background px-2 py-1 text-sm"
						>
							{FIELD_TYPES.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
						<input
							type="text"
							value={field.placeholder ?? ""}
							onChange={(e) => {
								const val = e.target.value;
								updateField(
									idx,
									val ? { placeholder: val } : { placeholder: "" },
								);
							}}
							placeholder="Placeholder"
							className="rounded-md border border-border bg-background px-2 py-1 text-sm"
						/>
						<label className="flex items-center gap-1.5 text-sm">
							<input
								type="checkbox"
								checked={field.required}
								onChange={(e) =>
									updateField(idx, { required: e.target.checked })
								}
								className="rounded"
							/>
							Required
						</label>
					</div>
					{(field.type === "select" || field.type === "radio") && (
						<div className="mt-2">
							<input
								type="text"
								value={(field.options ?? []).join(", ")}
								onChange={(e) =>
									updateField(idx, {
										options: e.target.value
											.split(",")
											.map((s) => s.trim())
											.filter(Boolean),
									})
								}
								placeholder="Options (comma-separated)"
								className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
							/>
						</div>
					)}
				</div>
			))}
			<button
				type="button"
				onClick={addField}
				className="rounded-lg border border-border border-dashed px-3 py-2 text-muted-foreground text-sm hover:border-foreground hover:text-foreground"
			>
				+ Add field
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FormsList
// ---------------------------------------------------------------------------

export function FormsList() {
	const api = useFormsApi();
	const { data, isLoading } = api.list.useQuery({}) as {
		data: { forms?: Form[] } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: FormStats } | undefined;
	};

	const forms = data?.forms ?? [];
	const stats = statsData?.stats;

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Forms</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Create and manage custom forms, contact pages, and surveys
					</p>
				</div>
				<a
					href="/admin/forms/create"
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					Create form
				</a>
			</div>

			{/* Stats row */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Forms
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalForms}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Submissions
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalSubmissions}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Unread
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.unreadCount}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Spam
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.spamCount}
						</p>
					</div>
				</div>
			) : null}

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : forms.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No forms yet. Create your first form to start collecting
						submissions.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b bg-muted/40">
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Name
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Slug
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Fields
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Status
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Created
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{forms.map((form) => (
								<tr key={form.id} className="hover:bg-muted/30">
									<td className="px-4 py-3">
										<a
											href={`/admin/forms/${form.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{form.name}
										</a>
										{form.description ? (
											<p className="mt-0.5 text-muted-foreground text-xs">
												{form.description}
											</p>
										) : null}
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{form.slug}
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{form.fields.length}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												form.isActive
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{form.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{formatDate(form.createdAt)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// FormCreate
// ---------------------------------------------------------------------------

export function FormCreate() {
	const api = useFormsApi();
	const createMutation = api.create.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<{
			form?: Form;
		}>;
		isPending: boolean;
	};

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [submitLabel, setSubmitLabel] = useState("Submit");
	const [successMessage, setSuccessMessage] = useState(
		"Thank you for your submission.",
	);
	const [notifyEmail, setNotifyEmail] = useState("");
	const [honeypotEnabled, setHoneypotEnabled] = useState(true);
	const [maxSubmissions, setMaxSubmissions] = useState(0);
	const [fields, setFields] = useState<FormField[]>([]);
	const [error, setError] = useState("");

	const handleNameChange = (val: string) => {
		setName(val);
		setSlug(slugify(val));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!name.trim() || !slug.trim()) {
			setError("Name and slug are required.");
			return;
		}

		try {
			const result = await createMutation.mutateAsync({
				body: {
					name: name.trim(),
					slug: slug.trim(),
					description: description.trim() || undefined,
					fields,
					submitLabel: submitLabel.trim(),
					successMessage: successMessage.trim(),
					notifyEmail: notifyEmail.trim() || undefined,
					honeypotEnabled,
					maxSubmissions,
				},
			});

			if (result.form) {
				window.location.href = `/admin/forms/${result.form.id}`;
			}
		} catch (err) {
			setError(extractError(err));
		}
	};

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/forms"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to forms
				</a>
			</div>

			<h1 className="mb-6 font-bold text-2xl text-foreground">Create Form</h1>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Basic info */}
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Basic Information
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Name</span>
							<input
								type="text"
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder="Contact Us"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Slug</span>
							<input
								type="text"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="contact-us"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
					<div className="mt-4">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Description
							</span>
							<input
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
				</div>

				{/* Fields */}
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Form Fields
					</h2>
					<FieldBuilder fields={fields} onChange={setFields} />
				</div>

				{/* Settings */}
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Settings
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Submit Button Label
							</span>
							<input
								type="text"
								value={submitLabel}
								onChange={(e) => setSubmitLabel(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Notification Email
							</span>
							<input
								type="email"
								value={notifyEmail}
								onChange={(e) => setNotifyEmail(e.target.value)}
								placeholder="admin@example.com"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
					<div className="mt-4">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Success Message
							</span>
							<textarea
								value={successMessage}
								onChange={(e) => setSuccessMessage(e.target.value)}
								rows={2}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
					</div>
					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Max Submissions (0 = unlimited)
							</span>
							<input
								type="number"
								min={0}
								value={maxSubmissions}
								onChange={(e) =>
									setMaxSubmissions(Number.parseInt(e.target.value, 10) || 0)
								}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<div className="flex items-end pb-1">
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={honeypotEnabled}
									onChange={(e) => setHoneypotEnabled(e.target.checked)}
									className="rounded"
								/>
								Enable honeypot spam protection
							</label>
						</div>
					</div>
				</div>

				<div className="flex gap-3">
					<button
						type="submit"
						disabled={createMutation.isPending}
						className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
					>
						{createMutation.isPending ? "Creating..." : "Create Form"}
					</button>
					<a
						href="/admin/forms"
						className="rounded-lg border border-border bg-card px-4 py-2 text-foreground text-sm hover:bg-muted"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FormDetail
// ---------------------------------------------------------------------------

export function FormDetail({ params }: { params?: Record<string, string> }) {
	const id = params?.id ?? "";
	const api = useFormsApi();

	const { data, isLoading } = api.detail.useQuery({ id }) as {
		data: { form?: Form } | undefined;
		isLoading: boolean;
	};

	const updateMutation = api.update.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<{ form?: Form }>;
		isPending: boolean;
	};
	const deleteMutation = api.deleteForm.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const form = data?.form;

	const [editing, setEditing] = useState(false);
	const [editName, setEditName] = useState("");
	const [editSlug, setEditSlug] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editSubmitLabel, setEditSubmitLabel] = useState("");
	const [editSuccessMessage, setEditSuccessMessage] = useState("");
	const [editNotifyEmail, setEditNotifyEmail] = useState("");
	const [editHoneypotEnabled, setEditHoneypotEnabled] = useState(true);
	const [editMaxSubmissions, setEditMaxSubmissions] = useState(0);
	const [editFields, setEditFields] = useState<FormField[]>([]);
	const [error, setError] = useState("");

	const startEditing = () => {
		if (!form) return;
		setEditName(form.name);
		setEditSlug(form.slug);
		setEditDescription(form.description ?? "");
		setEditSubmitLabel(form.submitLabel);
		setEditSuccessMessage(form.successMessage);
		setEditNotifyEmail(form.notifyEmail ?? "");
		setEditHoneypotEnabled(form.honeypotEnabled);
		setEditMaxSubmissions(form.maxSubmissions);
		setEditFields(form.fields);
		setEditing(true);
		setError("");
	};

	const handleSave = async () => {
		setError("");
		try {
			await updateMutation.mutateAsync({
				params: { id },
				body: {
					name: editName.trim(),
					slug: editSlug.trim(),
					description: editDescription.trim() || undefined,
					fields: editFields,
					submitLabel: editSubmitLabel.trim(),
					successMessage: editSuccessMessage.trim(),
					notifyEmail: editNotifyEmail.trim() || undefined,
					honeypotEnabled: editHoneypotEnabled,
					maxSubmissions: editMaxSubmissions,
				},
			});
			setEditing(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleToggleActive = async () => {
		if (!form) return;
		try {
			await updateMutation.mutateAsync({
				params: { id },
				body: { isActive: !form.isActive },
			});
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async () => {
		if (!confirm("Delete this form and all its submissions?")) return;
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.href = "/admin/forms";
		} catch (err) {
			setError(extractError(err));
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/forms"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to forms
					</a>
				</div>
				<div className="space-y-4">
					<div className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
					<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
				</div>
			</div>
		);
	}

	if (!form) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/forms"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to forms
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">Form not found.</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/forms"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to forms
				</a>
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Header */}
					<div className="rounded-lg border border-border bg-card p-5">
						<div className="mb-3 flex items-start justify-between gap-3">
							<div>
								<h1 className="font-bold text-foreground text-lg">
									{form.name}
								</h1>
								{form.description ? (
									<p className="mt-1 text-muted-foreground text-sm">
										{form.description}
									</p>
								) : null}
							</div>
							<span
								className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium text-xs ${
									form.isActive
										? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
										: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
								}`}
							>
								{form.isActive ? "Active" : "Inactive"}
							</span>
						</div>
						<div className="flex flex-wrap gap-2 border-border border-t pt-3">
							{!editing ? (
								<>
									<button
										type="button"
										onClick={startEditing}
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-foreground text-sm hover:bg-muted"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={handleToggleActive}
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-sm hover:bg-muted"
									>
										{form.isActive ? "Deactivate" : "Activate"}
									</button>
									<a
										href={`/admin/forms/${form.id}/submissions`}
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-foreground text-sm hover:bg-muted"
									>
										View Submissions
									</a>
									<button
										type="button"
										onClick={handleDelete}
										disabled={deleteMutation.isPending}
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										Delete
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={handleSave}
										disabled={updateMutation.isPending}
										className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
									>
										{updateMutation.isPending ? "Saving..." : "Save Changes"}
									</button>
									<button
										type="button"
										onClick={() => setEditing(false)}
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-foreground text-sm hover:bg-muted"
									>
										Cancel
									</button>
								</>
							)}
						</div>
					</div>

					{/* Fields section */}
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Fields ({editing ? editFields.length : form.fields.length})
							</h2>
						</div>

						{editing ? (
							<div className="p-4">
								<FieldBuilder fields={editFields} onChange={setEditFields} />
							</div>
						) : form.fields.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No fields defined. Edit this form to add fields.
							</div>
						) : (
							<div className="divide-y divide-border">
								{form.fields
									.sort((a, b) => a.position - b.position)
									.map((field) => (
										<div
											key={field.name}
											className="flex items-center justify-between px-4 py-3"
										>
											<div>
												<p className="font-medium text-foreground text-sm">
													{field.label}
												</p>
												<p className="text-muted-foreground text-xs">
													{field.type}
													{field.required ? " · required" : ""}
													{field.placeholder ? ` · "${field.placeholder}"` : ""}
													{field.options
														? ` · options: ${field.options.join(", ")}`
														: ""}
												</p>
											</div>
											<span className="font-mono text-muted-foreground text-xs">
												{field.name}
											</span>
										</div>
									))}
							</div>
						)}
					</div>

					{/* Edit settings section */}
					{editing ? (
						<div className="rounded-lg border border-border bg-card p-5">
							<h2 className="mb-4 font-semibold text-foreground text-sm">
								Settings
							</h2>
							<div className="grid gap-4 sm:grid-cols-2">
								<label className="block">
									<span className="mb-1 block font-medium text-sm">Name</span>
									<input
										type="text"
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block font-medium text-sm">Slug</span>
									<input
										type="text"
										value={editSlug}
										onChange={(e) => setEditSlug(e.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block font-medium text-sm">
										Submit Button Label
									</span>
									<input
										type="text"
										value={editSubmitLabel}
										onChange={(e) => setEditSubmitLabel(e.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block font-medium text-sm">
										Notification Email
									</span>
									<input
										type="email"
										value={editNotifyEmail}
										onChange={(e) => setEditNotifyEmail(e.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
							</div>
							<div className="mt-4">
								<label className="block">
									<span className="mb-1 block font-medium text-sm">
										Description
									</span>
									<input
										type="text"
										value={editDescription}
										onChange={(e) => setEditDescription(e.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
							</div>
							<div className="mt-4">
								<label className="block">
									<span className="mb-1 block font-medium text-sm">
										Success Message
									</span>
									<textarea
										value={editSuccessMessage}
										onChange={(e) => setEditSuccessMessage(e.target.value)}
										rows={2}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
							</div>
							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<label className="block">
									<span className="mb-1 block font-medium text-sm">
										Max Submissions (0 = unlimited)
									</span>
									<input
										type="number"
										min={0}
										value={editMaxSubmissions}
										onChange={(e) =>
											setEditMaxSubmissions(
												Number.parseInt(e.target.value, 10) || 0,
											)
										}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									/>
								</label>
								<div className="flex items-end pb-1">
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={editHoneypotEnabled}
											onChange={(e) => setEditHoneypotEnabled(e.target.checked)}
											className="rounded"
										/>
										Enable honeypot spam protection
									</label>
								</div>
							</div>
						</div>
					) : null}
				</div>

				{/* Right sidebar */}
				<div className="space-y-6">
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Status</dt>
								<dd className="font-medium text-foreground">
									{form.isActive ? "Active" : "Inactive"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Slug</dt>
								<dd className="font-medium font-mono text-foreground">
									{form.slug}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Fields</dt>
								<dd className="font-medium text-foreground">
									{form.fields.length}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Submit Label</dt>
								<dd className="font-medium text-foreground">
									{form.submitLabel}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Honeypot</dt>
								<dd className="font-medium text-foreground">
									{form.honeypotEnabled ? "Enabled" : "Disabled"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Max Submissions</dt>
								<dd className="font-medium text-foreground">
									{form.maxSubmissions === 0
										? "Unlimited"
										: form.maxSubmissions}
								</dd>
							</div>
							{form.notifyEmail ? (
								<div>
									<dt className="text-muted-foreground">Notify Email</dt>
									<dd className="font-medium text-foreground">
										{form.notifyEmail}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Created</dt>
								<dd className="font-medium text-foreground">
									{formatDate(form.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Updated</dt>
								<dd className="font-medium text-foreground">
									{formatDate(form.updatedAt)}
								</dd>
							</div>
						</dl>
					</div>

					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Success Message
						</h3>
						<p className="text-foreground text-sm">{form.successMessage}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FormSubmissions
// ---------------------------------------------------------------------------

export function FormSubmissions({
	params,
}: {
	params?: Record<string, string>;
}) {
	const formId = params?.id ?? "";
	const api = useFormsApi();

	const [statusFilter, setStatusFilter] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const { data: formData, isLoading: formLoading } = api.detail.useQuery({
		id: formId,
	}) as {
		data: { form?: Form } | undefined;
		isLoading: boolean;
	};

	const { data: subData, isLoading: subLoading } = api.submissions.useQuery({
		formId,
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { submissions?: FormSubmission[] } | undefined;
		isLoading: boolean;
	};

	const updateStatusMutation = api.updateStatus.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: { status: string };
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const bulkDeleteMutation = api.bulkDelete.useMutation() as {
		mutateAsync: (opts: { body: { ids: string[] } }) => Promise<unknown>;
		isPending: boolean;
	};

	const form = formData?.form;
	const submissions = subData?.submissions ?? [];
	const isLoading = formLoading || subLoading;

	const toggleSelect = (subId: string) => {
		setSelected((prev: Set<string>) => {
			const next = new Set(prev);
			if (next.has(subId)) {
				next.delete(subId);
			} else {
				next.add(subId);
			}
			return next;
		});
	};

	const toggleSelectAll = () => {
		if (selected.size === submissions.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(submissions.map((s) => s.id)));
		}
	};

	const handleStatusChange = async (subId: string, status: string) => {
		try {
			await updateStatusMutation.mutateAsync({
				params: { id: subId },
				body: { status },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleBulkDelete = async () => {
		if (selected.size === 0) return;
		if (!confirm(`Delete ${selected.size} submission(s)?`)) return;
		try {
			await bulkDeleteMutation.mutateAsync({
				body: { ids: Array.from(selected) },
			});
			setSelected(new Set());
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/forms"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to forms
					</a>
				</div>
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href={form ? `/admin/forms/${form.id}` : "/admin/forms"}
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to {form?.name ?? "forms"}
				</a>
			</div>

			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-bold text-2xl text-foreground">
						Submissions{form ? `: ${form.name}` : ""}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{submissions.length} submission
						{submissions.length !== 1 ? "s" : ""}
					</p>
				</div>
				<div className="flex gap-2">
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
					>
						<option value="">All statuses</option>
						<option value="unread">Unread</option>
						<option value="read">Read</option>
						<option value="spam">Spam</option>
						<option value="archived">Archived</option>
					</select>
					{selected.size > 0 ? (
						<button
							type="button"
							onClick={handleBulkDelete}
							disabled={bulkDeleteMutation.isPending}
							className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
						>
							Delete ({selected.size})
						</button>
					) : null}
				</div>
			</div>

			{submissions.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No submissions{statusFilter ? ` with status "${statusFilter}"` : ""}{" "}
						yet.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{/* Select all */}
					<div className="flex items-center gap-2 px-1">
						<input
							type="checkbox"
							checked={
								selected.size === submissions.length && submissions.length > 0
							}
							onChange={toggleSelectAll}
							className="rounded"
						/>
						<span className="text-muted-foreground text-xs">Select all</span>
					</div>

					{submissions.map((sub) => (
						<div
							key={sub.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="mb-2 flex items-start justify-between gap-3">
								<div className="flex items-start gap-3">
									<input
										type="checkbox"
										checked={selected.has(sub.id)}
										onChange={() => toggleSelect(sub.id)}
										className="mt-1 rounded"
									/>
									<div>
										<div className="flex items-center gap-2">
											<span
												className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[sub.status] ?? "bg-muted text-muted-foreground"}`}
											>
												{sub.status}
											</span>
											<span className="text-muted-foreground text-xs">
												{formatDate(sub.createdAt)}
											</span>
											{sub.ipAddress ? (
												<span className="text-muted-foreground text-xs">
													{sub.ipAddress}
												</span>
											) : null}
										</div>
									</div>
								</div>
								<div className="flex gap-1">
									{sub.status === "unread" ? (
										<button
											type="button"
											onClick={() => handleStatusChange(sub.id, "read")}
											className="rounded px-2 py-1 text-xs hover:bg-muted"
										>
											Mark Read
										</button>
									) : sub.status === "read" ? (
										<button
											type="button"
											onClick={() => handleStatusChange(sub.id, "archived")}
											className="rounded px-2 py-1 text-xs hover:bg-muted"
										>
											Archive
										</button>
									) : null}
									{sub.status !== "spam" ? (
										<button
											type="button"
											onClick={() => handleStatusChange(sub.id, "spam")}
											className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
										>
											Spam
										</button>
									) : (
										<button
											type="button"
											onClick={() => handleStatusChange(sub.id, "unread")}
											className="rounded px-2 py-1 text-xs hover:bg-muted"
										>
											Not Spam
										</button>
									)}
								</div>
							</div>

							{/* Submitted values */}
							<div className="mt-2 rounded-md bg-muted/30 p-3">
								<dl className="grid gap-1 text-sm sm:grid-cols-2">
									{Object.entries(sub.values).map(([key, val]) => (
										<div key={key}>
											<dt className="font-medium text-muted-foreground text-xs">
												{key}
											</dt>
											<dd className="text-foreground">
												{val === null || val === undefined ? "—" : String(val)}
											</dd>
										</div>
									))}
								</dl>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
