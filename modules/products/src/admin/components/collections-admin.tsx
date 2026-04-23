"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useRef, useState } from "react";
import CollectionsAdminTemplate from "./collections-admin.mdx";

interface Collection {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	image?: string | null;
	isFeatured: boolean;
	isVisible: boolean;
	position: number;
}

interface Product {
	id: string;
	name: string;
	slug: string;
	price: number;
	status: string;
	images: string[];
}

interface ListResult {
	collections: Collection[];
}

const ROW_SKELETON_IDS = ["a", "b", "c", "d"] as const;
const CELL_SKELETON_IDS = ["a", "b", "c", "d", "e"] as const;

interface ProductListResult {
	products: Product[];
}

// ─── Module Client ───────────────────────────────────────────────────────────

function useCollectionsAdminApi() {
	const client = useModuleClient();
	return {
		listCollections:
			client.module("products").admin["/admin/products/collections/list"],
		createCollection:
			client.module("products").admin["/admin/products/collections/create"],
		updateCollection:
			client.module("products").admin["/admin/products/collections/:id/update"],
		deleteCollection:
			client.module("products").admin["/admin/products/collections/:id/delete"],
		addProduct:
			client.module("products").admin[
				"/admin/products/collections/:id/products"
			],
		removeProduct:
			client.module("products").admin[
				"/admin/products/collections/:id/products/:productId/remove"
			],
		listProducts: client.module("products").admin["/admin/products/list"],
	};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractError(error: Error | null, fallback: string): string {
	if (!error) return fallback;
	const body = (
		error as Error & { body?: { error?: string | { message?: string } } }
	).body;
	if (typeof body?.error === "string") return body.error;
	if (typeof body?.error?.message === "string") return body.error.message;
	return fallback;
}

function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function formatPrice(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

export function CollectionsAdmin() {
	const api = useCollectionsAdminApi();

	const [showForm, setShowForm] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState({
		name: "",
		slug: "",
		description: "",
		image: "",
		isFeatured: false,
		isVisible: true,
	});
	const [error, setError] = useState<string | null>(null);
	const [slugEdited, setSlugEdited] = useState(false);
	const [manageId, setManageId] = useState<string | null>(null);
	const [productSearch, setProductSearch] = useState("");

	const { data: collectionsData, isLoading: loading } =
		api.listCollections.useQuery({ limit: "100" }) as {
			data: ListResult | undefined;
			isLoading: boolean;
		};

	const collections = collectionsData?.collections ?? [];

	// Products for adding to collections
	const { data: productsData } = api.listProducts.useQuery({
		limit: "200",
		status: "active",
	}) as { data: ProductListResult | undefined };

	const allProducts = productsData?.products ?? [];

	const createMutation = api.createCollection.useMutation({
		onSuccess: () => {
			setShowForm(false);
			setEditId(null);
			void api.listCollections.invalidate();
		},
		onError: (err: Error) => {
			setError(extractError(err, "Failed to save collection"));
		},
	});

	const updateMutation = api.updateCollection.useMutation({
		onSuccess: () => {
			setShowForm(false);
			setEditId(null);
			void api.listCollections.invalidate();
		},
		onError: (err: Error) => {
			setError(extractError(err, "Failed to save collection"));
		},
	});

	const deleteMutation = api.deleteCollection.useMutation({
		onSettled: () => {
			void api.listCollections.invalidate();
		},
	});

	const addProductMutation = api.addProduct.useMutation({
		onSuccess: () => {
			setProductSearch("");
		},
	});

	const removeProductMutation = api.removeProduct.useMutation();

	const saving = createMutation.isPending || updateMutation.isPending;

	const openCreate = () => {
		setForm({
			name: "",
			slug: "",
			description: "",
			image: "",
			isFeatured: false,
			isVisible: true,
		});
		setSlugEdited(false);
		setEditId(null);
		setError(null);
		setShowForm(true);
	};

	const openEdit = (col: Collection) => {
		setForm({
			name: col.name,
			slug: col.slug,
			description: col.description ?? "",
			image: col.image ?? "",
			isFeatured: col.isFeatured,
			isVisible: col.isVisible,
		});
		setSlugEdited(true);
		setEditId(col.id);
		setError(null);
		setShowForm(true);
	};

	const handleNameChange = (name: string) => {
		setForm((prev) => ({
			...prev,
			name,
			slug: slugEdited ? prev.slug : slugify(name),
		}));
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!form.name.trim()) {
			setError("Name is required");
			return;
		}
		if (!form.slug.trim()) {
			setError("Slug is required");
			return;
		}

		const body = {
			name: form.name.trim(),
			slug: form.slug.trim(),
			description: form.description.trim() || undefined,
			image: form.image.trim() || undefined,
			isFeatured: form.isFeatured,
			isVisible: form.isVisible,
		};

		if (editId) {
			updateMutation.mutate({ params: { id: editId }, ...body });
		} else {
			createMutation.mutate(body);
		}
	};

	const handleDelete = (col: Collection) => {
		if (!confirm(`Delete "${col.name}"? This cannot be undone.`)) return;
		deleteMutation.mutate({ params: { id: col.id } });
	};

	const handleAddProduct = (productId: string) => {
		if (!manageId) return;
		addProductMutation.mutate({
			params: { id: manageId },
			productId,
		});
	};

	const handleRemoveProduct = (productId: string) => {
		if (!manageId) return;
		removeProductMutation.mutate({
			params: { id: manageId, productId },
		});
	};

	const filteredProducts = productSearch
		? allProducts.filter((p) =>
				p.name.toLowerCase().includes(productSearch.toLowerCase()),
			)
		: allProducts;

	const content = (
		<div>
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Collections</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Curate product sets for marketing and merchandising
					</p>
				</div>
				<button
					type="button"
					onClick={openCreate}
					className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 font-semibold text-background text-sm transition-opacity hover:opacity-90"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M5 12h14" />
						<path d="M12 5v14" />
					</svg>
					Add collection
				</button>
			</div>

			{/* Inline form */}
			{showForm && (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						{editId ? "Edit collection" : "New collection"}
					</h2>
					<form onSubmit={handleSave} className="space-y-4">
						{error && (
							<p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
								{error}
							</p>
						)}
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor="col-name"
									className="mb-1.5 block font-medium text-foreground text-sm"
								>
									Name <span className="text-destructive">*</span>
								</label>
								<input
									id="col-name"
									type="text"
									value={form.name}
									onChange={(e) => handleNameChange(e.target.value)}
									placeholder="Collection name"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="col-slug"
									className="mb-1.5 block font-medium text-foreground text-sm"
								>
									Slug <span className="text-destructive">*</span>
								</label>
								<input
									id="col-slug"
									type="text"
									value={form.slug}
									onChange={(e) => {
										setSlugEdited(true);
										setForm((p) => ({ ...p, slug: e.target.value }));
									}}
									placeholder="collection-slug"
									className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									required
								/>
							</div>
						</div>
						<div>
							<label
								htmlFor="col-desc"
								className="mb-1.5 block font-medium text-foreground text-sm"
							>
								Description
							</label>
							<textarea
								id="col-desc"
								value={form.description}
								onChange={(e) =>
									setForm((p) => ({ ...p, description: e.target.value }))
								}
								placeholder="Optional description"
								rows={2}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<CollectionImageField
							image={form.image}
							onChange={(url) => setForm((p) => ({ ...p, image: url }))}
						/>
						<div className="flex gap-6">
							<label className="flex items-center gap-2.5">
								<input
									type="checkbox"
									checked={form.isVisible}
									onChange={(e) =>
										setForm((p) => ({ ...p, isVisible: e.target.checked }))
									}
									className="h-4 w-4 rounded border-border"
								/>
								<span className="text-foreground text-sm">
									Visible in store
								</span>
							</label>
							<label className="flex items-center gap-2.5">
								<input
									type="checkbox"
									checked={form.isFeatured}
									onChange={(e) =>
										setForm((p) => ({ ...p, isFeatured: e.target.checked }))
									}
									className="h-4 w-4 rounded border-border"
								/>
								<span className="text-foreground text-sm">Featured</span>
							</label>
						</div>
						<div className="flex gap-2 pt-1">
							<button
								type="submit"
								disabled={saving}
								className="rounded-md bg-foreground px-4 py-2 font-semibold text-background text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
							>
								{saving
									? "Saving..."
									: editId
										? "Save changes"
										: "Create collection"}
							</button>
							<button
								type="button"
								onClick={() => setShowForm(false)}
								className="rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Manage products panel */}
			{manageId && (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-semibold text-foreground text-sm">
							Manage products —{" "}
							{collections.find((c) => c.id === manageId)?.name}
						</h2>
						<button
							type="button"
							onClick={() => setManageId(null)}
							className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
						>
							Close
						</button>
					</div>
					<div className="relative mb-3">
						<input
							type="search"
							value={productSearch}
							onChange={(e) => setProductSearch(e.target.value)}
							placeholder="Search products to add..."
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>
					{filteredProducts.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground text-sm">
							No products found
						</p>
					) : (
						<div className="max-h-64 space-y-1 overflow-y-auto">
							{filteredProducts.slice(0, 20).map((product) => (
								<div
									key={product.id}
									className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
								>
									<div className="flex items-center gap-3">
										{product.images[0] ? (
											<img
												src={product.images[0]}
												alt={product.name}
												className="h-8 w-8 rounded object-cover"
											/>
										) : (
											<div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													aria-hidden="true"
												>
													<rect width="18" height="18" x="3" y="3" rx="2" />
													<circle cx="9" cy="9" r="2" />
													<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
												</svg>
											</div>
										)}
										<div>
											<p className="font-medium text-foreground text-sm">
												{product.name}
											</p>
											<p className="text-muted-foreground text-xs">
												{formatPrice(product.price)}
											</p>
										</div>
									</div>
									<div className="flex gap-1">
										<button
											type="button"
											onClick={() => handleAddProduct(product.id)}
											disabled={addProductMutation.isPending}
											className="rounded-md bg-foreground px-2.5 py-1 font-medium text-background text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
										>
											Add
										</button>
										<button
											type="button"
											onClick={() => handleRemoveProduct(product.id)}
											disabled={removeProductMutation.isPending}
											className="rounded-md border border-border px-2.5 py-1 font-medium text-destructive text-xs transition-colors hover:bg-destructive/10"
										>
											Remove
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Table */}
			<div className="overflow-hidden rounded-lg border border-border bg-card">
				<table className="w-full">
					<thead>
						<tr className="border-border border-b bg-muted/50">
							<th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								Name
							</th>
							<th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide sm:table-cell">
								Slug
							</th>
							<th className="hidden px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide md:table-cell">
								Featured
							</th>
							<th className="hidden px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide lg:table-cell">
								Visible
							</th>
							<th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							ROW_SKELETON_IDS.map((rowId) => (
								<tr key={`collection-skeleton-${rowId}`}>
									{CELL_SKELETON_IDS.map((cellId) => (
										<td key={`collection-cell-${cellId}`} className="px-4 py-3">
											<div className="h-4 w-24 animate-pulse rounded bg-muted" />
										</td>
									))}
								</tr>
							))
						) : collections.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-12 text-center">
									<p className="font-medium text-foreground text-sm">
										No collections yet
									</p>
									<p className="mt-1 text-muted-foreground text-xs">
										Create your first collection to curate product sets
									</p>
									<button
										type="button"
										onClick={openCreate}
										className="mt-3 font-medium text-foreground text-sm underline underline-offset-2"
									>
										Add collection
									</button>
								</td>
							</tr>
						) : (
							collections.map((col) => (
								<tr
									key={col.id}
									className="transition-colors hover:bg-muted/30"
								>
									<td className="px-4 py-3">
										<div className="flex items-center gap-3">
											{col.image ? (
												<img
													src={col.image}
													alt={col.name}
													className="h-8 w-8 rounded object-cover"
												/>
											) : (
												<div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="14"
														height="14"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
														aria-hidden="true"
													>
														<rect width="18" height="18" x="3" y="3" rx="2" />
														<path d="M7.5 7.5h.01" />
														<path d="M16.5 7.5h.01" />
														<path d="M7.5 16.5h.01" />
														<path d="M16.5 16.5h.01" />
													</svg>
												</div>
											)}
											<span className="font-medium text-foreground text-sm">
												{col.name}
											</span>
										</div>
									</td>
									<td className="hidden px-4 py-3 font-mono text-muted-foreground text-xs sm:table-cell">
										{col.slug}
									</td>
									<td className="hidden px-4 py-3 text-center md:table-cell">
										<span
											className={`inline-flex h-2 w-2 rounded-full ${col.isFeatured ? "bg-amber-500" : "bg-muted-foreground/30"}`}
										/>
									</td>
									<td className="hidden px-4 py-3 text-center lg:table-cell">
										<span
											className={`inline-flex h-2 w-2 rounded-full ${col.isVisible ? "bg-green-500" : "bg-muted-foreground/30"}`}
										/>
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												type="button"
												onClick={() =>
													setManageId(manageId === col.id ? null : col.id)
												}
												className="rounded-md px-2.5 py-1.5 font-medium text-foreground text-xs transition-colors hover:bg-muted"
											>
												Products
											</button>
											<button
												type="button"
												onClick={() => openEdit(col)}
												className="rounded-md px-2.5 py-1.5 font-medium text-foreground text-xs transition-colors hover:bg-muted"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => handleDelete(col)}
												className="rounded-md px-2.5 py-1.5 font-medium text-destructive text-xs transition-colors hover:bg-destructive/10"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);

	return <CollectionsAdminTemplate content={content} />;
}

// ─── Inline image upload for collections ─────────────────────────────────────

function CollectionImageField({
	image,
	onChange,
}: {
	image: string;
	onChange: (url: string) => void;
}) {
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = async (file: File) => {
		setUploadError(null);
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error ?? "Upload failed");
			}
			const data = (await res.json()) as { url: string };
			onChange(data.url);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	return (
		<div>
			<span className="mb-1.5 block font-medium text-foreground text-sm">
				Cover image
			</span>
			{image ? (
				<div className="flex items-start gap-3">
					<div className="h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
						<img
							src={image}
							alt="Collection"
							className="h-full w-full object-cover"
						/>
					</div>
					<button
						type="button"
						onClick={() => onChange("")}
						className="rounded-md px-2 py-1 text-destructive text-xs hover:bg-destructive/10"
					>
						Remove
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={uploading}
					className="flex h-20 w-20 flex-col items-center justify-center rounded-md border-2 border-border border-dashed text-muted-foreground transition-colors hover:border-muted-foreground hover:bg-muted/30 disabled:opacity-60"
				>
					{uploading ? (
						<svg
							className="h-5 w-5 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							/>
						</svg>
					) : (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<rect width="18" height="18" x="3" y="3" rx="2" />
								<circle cx="9" cy="9" r="2" />
								<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
							</svg>
							<span className="mt-0.5 text-2xs">Upload</span>
						</>
					)}
				</button>
			)}
			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) void handleFile(file);
				}}
			/>
			{uploadError && (
				<p className="mt-1 text-destructive text-xs">{uploadError}</p>
			)}
		</div>
	);
}
