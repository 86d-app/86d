"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FaqCategory {
	id: string;
	name: string;
	slug: string;
	description?: string;
	icon?: string;
	position: number;
	isVisible: boolean;
	createdAt: string;
	updatedAt: string;
}

interface FaqItem {
	id: string;
	categoryId: string;
	question: string;
	answer: string;
	slug: string;
	position: number;
	isVisible: boolean;
	tags?: string[];
	helpfulCount: number;
	notHelpfulCount: number;
	createdAt: string;
	updatedAt: string;
}

interface FaqStats {
	totalCategories: number;
	totalItems: number;
	totalHelpful: number;
	totalNotHelpful: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useFaqApi() {
	const client = useModuleClient();
	return {
		listItems: client.module("faq").admin["/admin/faq/items"],
		createItem: client.module("faq").admin["/admin/faq/items/create"],
		getItem: client.module("faq").admin["/admin/faq/items/:id"],
		updateItem: client.module("faq").admin["/admin/faq/items/:id"],
		deleteItem: client.module("faq").admin["/admin/faq/items/:id/delete"],
		listCategories: client.module("faq").admin["/admin/faq/categories"],
		createCategory: client.module("faq").admin["/admin/faq/categories/create"],
		updateCategory: client.module("faq").admin["/admin/faq/categories/:id"],
		deleteCategory:
			client.module("faq").admin["/admin/faq/categories/:id/delete"],
		stats: client.module("faq").admin["/admin/faq/stats"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// FaqList — main FAQ items page
// ---------------------------------------------------------------------------

export function FaqList() {
	const api = useFaqApi();
	const [categoryFilter, setCategoryFilter] = useState("");
	const [showCreate, setShowCreate] = useState(false);

	// Form state
	const [newQuestion, setNewQuestion] = useState("");
	const [newAnswer, setNewAnswer] = useState("");
	const [newSlug, setNewSlug] = useState("");
	const [newCategoryId, setNewCategoryId] = useState("");
	const [newTags, setNewTags] = useState("");
	const [newPosition, setNewPosition] = useState(0);
	const [error, setError] = useState("");

	const { data, isLoading } = api.listItems.useQuery({
		...(categoryFilter ? { categoryId: categoryFilter } : {}),
	}) as {
		data: { items?: FaqItem[] } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: FaqStats } | undefined;
	};
	const { data: catData } = api.listCategories.useQuery({}) as {
		data: { categories?: FaqCategory[] } | undefined;
	};

	const items = data?.items ?? [];
	const stats = statsData?.stats;
	const categories = catData?.categories ?? [];

	const createMutation = api.createItem.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.deleteItem.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!newQuestion.trim() || !newAnswer.trim() || !newCategoryId) {
			setError("Question, answer, and category are required.");
			return;
		}
		const tags = newTags
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		try {
			await createMutation.mutateAsync({
				body: {
					categoryId: newCategoryId,
					question: newQuestion.trim(),
					answer: newAnswer.trim(),
					slug: newSlug.trim() || slugify(newQuestion),
					position: newPosition,
					...(tags.length > 0 ? { tags } : {}),
				},
			});
			setNewQuestion("");
			setNewAnswer("");
			setNewSlug("");
			setNewCategoryId("");
			setNewTags("");
			setNewPosition(0);
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this FAQ item?")) return;
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">FAQ</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage frequently asked questions
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Add question"}
				</button>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Categories
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalCategories}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Questions
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalItems}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Helpful Votes
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.totalHelpful}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Not Helpful
						</p>
						<p className="mt-1 font-bold text-2xl text-red-600">
							{stats.totalNotHelpful}
						</p>
					</div>
				</div>
			) : null}

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New FAQ Item
					</h2>
					{error ? (
						<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					) : null}
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Category</span>
								<select
									value={newCategoryId}
									onChange={(e) => setNewCategoryId(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								>
									<option value="">Select category</option>
									{categories.map((cat) => (
										<option key={cat.id} value={cat.id}>
											{cat.name}
										</option>
									))}
								</select>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={newSlug}
									onChange={(e) => setNewSlug(e.target.value)}
									placeholder="Auto-generated from question"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Question</span>
							<input
								type="text"
								value={newQuestion}
								onChange={(e) => {
									setNewQuestion(e.target.value);
									if (!newSlug) {
										setNewSlug(slugify(e.target.value));
									}
								}}
								placeholder="How do I track my order?"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Answer</span>
							<textarea
								value={newAnswer}
								onChange={(e) => setNewAnswer(e.target.value)}
								placeholder="Provide a clear answer..."
								rows={4}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Tags (comma-separated)
								</span>
								<input
									type="text"
									value={newTags}
									onChange={(e) => setNewTags(e.target.value)}
									placeholder="shipping, tracking, delivery"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Position</span>
								<input
									type="number"
									value={newPosition}
									onChange={(e) =>
										setNewPosition(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Question"}
						</button>
					</form>
				</div>
			) : null}

			{/* Filter */}
			<div className="mb-4 flex gap-2">
				<select
					value={categoryFilter}
					onChange={(e) => setCategoryFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All categories</option>
					{categories.map((cat) => (
						<option key={cat.id} value={cat.id}>
							{cat.name}
						</option>
					))}
				</select>
			</div>

			{/* Item list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : items.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No FAQ items yet. Add a question to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<a
											href={`/admin/faq/${item.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{item.question}
										</a>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												item.isVisible
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{item.isVisible ? "Visible" : "Hidden"}
										</span>
									</div>
									<p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
										{item.answer}
									</p>
									<p className="mt-1 text-muted-foreground text-xs">
										{categoryMap.get(item.categoryId) ?? "Uncategorized"}
										{` \u00B7 Position: ${item.position}`}
										{` \u00B7 \u{1F44D} ${item.helpfulCount} \u{1F44E} ${item.notHelpfulCount}`}
										{item.tags && item.tags.length > 0
											? ` \u00B7 ${item.tags.join(", ")}`
											: ""}
									</p>
								</div>
								<div className="flex gap-1">
									<a
										href={`/admin/faq/${item.id}`}
										className="rounded px-2 py-1 text-xs hover:bg-muted"
									>
										Edit
									</a>
									<button
										type="button"
										onClick={() => handleDelete(item.id)}
										className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// FaqDetail — edit a single FAQ item
// ---------------------------------------------------------------------------

export function FaqDetail({ params }: { params: { id: string } }) {
	const api = useFaqApi();
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [slug, setSlug] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [position, setPosition] = useState(0);
	const [isVisible, setIsVisible] = useState(true);
	const [tags, setTags] = useState("");
	const [initialized, setInitialized] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	const { data, isLoading } = api.getItem.useQuery({
		params: { id: params.id },
	}) as {
		data: { item?: FaqItem; error?: string } | undefined;
		isLoading: boolean;
	};
	const { data: catData } = api.listCategories.useQuery({}) as {
		data: { categories?: FaqCategory[] } | undefined;
	};

	const updateMutation = api.updateItem.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const item = data?.item;
	const categories = catData?.categories ?? [];

	if (item && !initialized) {
		setQuestion(item.question);
		setAnswer(item.answer);
		setSlug(item.slug);
		setCategoryId(item.categoryId);
		setPosition(item.position);
		setIsVisible(item.isVisible);
		setTags(item.tags?.join(", ") ?? "");
		setInitialized(true);
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSaved(false);
		if (!question.trim() || !answer.trim()) {
			setError("Question and answer are required.");
			return;
		}
		const parsedTags = tags
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		try {
			await updateMutation.mutateAsync({
				params: { id: params.id },
				body: {
					question: question.trim(),
					answer: answer.trim(),
					slug: slug.trim() || slugify(question),
					categoryId,
					position,
					isVisible,
					...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
				},
			});
			setSaved(true);
		} catch (err) {
			setError(extractError(err));
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-64 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (!item) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">FAQ item not found.</p>
				<a href="/admin/faq" className="mt-2 inline-block text-sm underline">
					Back to FAQ
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/faq"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to FAQ
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					Edit FAQ Item
				</h1>
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}
			{saved ? (
				<div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
					FAQ item saved successfully.
				</div>
			) : null}

			<form
				onSubmit={handleSave}
				className="max-w-3xl space-y-4 rounded-lg border border-border bg-card p-5"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Category</span>
						<select
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						>
							<option value="">Select category</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Slug</span>
						<input
							type="text"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
				</div>
				<label className="block">
					<span className="mb-1 block font-medium text-sm">Question</span>
					<input
						type="text"
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					/>
				</label>
				<label className="block">
					<span className="mb-1 block font-medium text-sm">Answer</span>
					<textarea
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						rows={6}
						className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					/>
				</label>
				<div className="grid gap-4 sm:grid-cols-3">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">
							Tags (comma-separated)
						</span>
						<input
							type="text"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Position</span>
						<input
							type="number"
							value={position}
							onChange={(e) =>
								setPosition(Number.parseInt(e.target.value, 10) || 0)
							}
							min={0}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="flex items-center gap-2 self-end pb-2">
						<input
							type="checkbox"
							checked={isVisible}
							onChange={(e) => setIsVisible(e.target.checked)}
							className="rounded border-border"
						/>
						<span className="font-medium text-sm">Visible</span>
					</label>
				</div>
				<div className="flex items-center gap-4">
					<button
						type="submit"
						disabled={updateMutation.isPending}
						className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
					>
						{updateMutation.isPending ? "Saving..." : "Save Changes"}
					</button>
					<span className="text-muted-foreground text-xs">
						Helpful: {item.helpfulCount} / Not helpful: {item.notHelpfulCount}
					</span>
				</div>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FaqCategories — category list + create
// ---------------------------------------------------------------------------

export function FaqCategories() {
	const api = useFaqApi();
	const [showCreate, setShowCreate] = useState(false);
	const [newName, setNewName] = useState("");
	const [newSlug, setNewSlug] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newIcon, setNewIcon] = useState("");
	const [newPosition, setNewPosition] = useState(0);
	const [error, setError] = useState("");

	const { data, isLoading } = api.listCategories.useQuery({}) as {
		data: { categories?: FaqCategory[] } | undefined;
		isLoading: boolean;
	};

	const createMutation = api.createCategory.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.deleteCategory.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const categories = data?.categories ?? [];

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!newName.trim()) {
			setError("Name is required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					name: newName.trim(),
					slug: newSlug.trim() || slugify(newName),
					description: newDescription.trim() || undefined,
					icon: newIcon.trim() || undefined,
					position: newPosition,
				},
			});
			setNewName("");
			setNewSlug("");
			setNewDescription("");
			setNewIcon("");
			setNewPosition(0);
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this category and all its FAQ items?")) return;
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">FAQ Categories</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Organize FAQ items by category
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Create category"}
				</button>
			</div>

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New FAQ Category
					</h2>
					{error ? (
						<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					) : null}
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Name</span>
								<input
									type="text"
									value={newName}
									onChange={(e) => {
										setNewName(e.target.value);
										if (!newSlug) {
											setNewSlug(slugify(e.target.value));
										}
									}}
									placeholder="Shipping & Delivery"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={newSlug}
									onChange={(e) => setNewSlug(e.target.value)}
									placeholder="shipping-delivery"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Description
								</span>
								<input
									type="text"
									value={newDescription}
									onChange={(e) => setNewDescription(e.target.value)}
									placeholder="Optional"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Icon</span>
								<input
									type="text"
									value={newIcon}
									onChange={(e) => setNewIcon(e.target.value)}
									placeholder="Package"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Position</span>
								<input
									type="number"
									value={newPosition}
									onChange={(e) =>
										setNewPosition(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Category"}
						</button>
					</form>
				</div>
			) : null}

			{/* Category list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : categories.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No FAQ categories yet. Create one to organize your questions.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{categories.map((cat) => (
						<div
							key={cat.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<a
											href={`/admin/faq/categories/${cat.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{cat.name}
										</a>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												cat.isVisible
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{cat.isVisible ? "Visible" : "Hidden"}
										</span>
									</div>
									<p className="mt-1 text-muted-foreground text-xs">
										Slug: {cat.slug}
										{cat.icon ? ` \u00B7 Icon: ${cat.icon}` : ""}
										{cat.description ? ` \u00B7 ${cat.description}` : ""}
										{` \u00B7 Position: ${cat.position}`}
									</p>
								</div>
								<div className="flex gap-1">
									<a
										href={`/admin/faq/categories/${cat.id}`}
										className="rounded px-2 py-1 text-xs hover:bg-muted"
									>
										Edit
									</a>
									<button
										type="button"
										onClick={() => handleDelete(cat.id)}
										className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// FaqCategoryDetail — edit a single category
// ---------------------------------------------------------------------------

export function FaqCategoryDetail({ params }: { params: { id: string } }) {
	const api = useFaqApi();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [icon, setIcon] = useState("");
	const [position, setPosition] = useState(0);
	const [isVisible, setIsVisible] = useState(true);
	const [initialized, setInitialized] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	const { data, isLoading } = api.listCategories.useQuery({}) as {
		data: { categories?: FaqCategory[] } | undefined;
		isLoading: boolean;
	};

	const updateMutation = api.updateCategory.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const categories = data?.categories ?? [];
	const category = categories.find((c) => c.id === params.id);

	if (category && !initialized) {
		setName(category.name);
		setSlug(category.slug);
		setDescription(category.description ?? "");
		setIcon(category.icon ?? "");
		setPosition(category.position);
		setIsVisible(category.isVisible);
		setInitialized(true);
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSaved(false);
		if (!name.trim()) {
			setError("Name is required.");
			return;
		}
		try {
			await updateMutation.mutateAsync({
				params: { id: params.id },
				body: {
					name: name.trim(),
					slug: slug.trim() || slugify(name),
					description: description.trim() || undefined,
					icon: icon.trim() || undefined,
					position,
					isVisible,
				},
			});
			setSaved(true);
		} catch (err) {
			setError(extractError(err));
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (!category) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Category not found.</p>
				<a
					href="/admin/faq/categories"
					className="mt-2 inline-block text-sm underline"
				>
					Back to categories
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/faq/categories"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to categories
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					Edit FAQ Category
				</h1>
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}
			{saved ? (
				<div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
					Category saved successfully.
				</div>
			) : null}

			<form
				onSubmit={handleSave}
				className="max-w-2xl space-y-4 rounded-lg border border-border bg-card p-5"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Slug</span>
						<input
							type="text"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Description</span>
						<input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Icon</span>
						<input
							type="text"
							value={icon}
							onChange={(e) => setIcon(e.target.value)}
							placeholder="Package"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Position</span>
						<input
							type="number"
							value={position}
							onChange={(e) =>
								setPosition(Number.parseInt(e.target.value, 10) || 0)
							}
							min={0}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="flex items-center gap-2 self-end pb-2">
						<input
							type="checkbox"
							checked={isVisible}
							onChange={(e) => setIsVisible(e.target.checked)}
							className="rounded border-border"
						/>
						<span className="font-medium text-sm">Visible</span>
					</label>
				</div>
				<button
					type="submit"
					disabled={updateMutation.isPending}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
				>
					{updateMutation.isPending ? "Saving..." : "Save Changes"}
				</button>
			</form>
		</div>
	);
}
