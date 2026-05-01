"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerGroup {
	id: string;
	name: string;
	slug: string;
	description?: string;
	type?: string;
	isActive?: boolean;
	priority?: number;
	memberCount?: number;
	isAutomatic: boolean;
	createdAt: string;
	updatedAt?: string;
}

interface GroupMember {
	id: string;
	customerId: string;
	customerEmail?: string;
	customerName?: string;
	joinedAt: string;
	expiresAt?: string;
}

interface GroupPriceAdjustment {
	id: string;
	adjustmentType: "percentage" | "fixed";
	value: number;
	scope: "all" | "category" | "product";
	scopeId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

const inputCls =
	"w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1";
const labelCls = "mb-1 block font-medium text-foreground text-sm";

// ─── API hooks ────────────────────────────────────────────────────────────────

function useGroupsApi() {
	const client = useModuleClient();
	return {
		list: client.module("customer-groups").admin["/admin/customer-groups"],
		create:
			client.module("customer-groups").admin["/admin/customer-groups/create"],
		get: client.module("customer-groups").admin["/admin/customer-groups/:id"],
		update:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/update"
			],
		delete:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/delete"
			],
		listMembers:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/members"
			],
		addMember:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/members/add"
			],
		removeMember:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/members/remove"
			],
		listPricing:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/pricing/list"
			],
		setPricing:
			client.module("customer-groups").admin[
				"/admin/customer-groups/:id/pricing"
			],
		removePricing:
			client.module("customer-groups").admin[
				"/admin/customer-groups/pricing/:adjustmentId/remove"
			],
	};
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteGroupModal({
	group,
	onClose,
	onSuccess,
}: {
	group: CustomerGroup;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const api = useGroupsApi();

	const deleteMutation = api.delete.useMutation({
		onSuccess: () => {
			void api.list.invalidate();
			onSuccess();
		},
	});

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
				<div className="px-6 py-5">
					<h2 className="font-semibold text-foreground text-lg">
						Delete group?
					</h2>
					<p className="mt-2 text-muted-foreground text-sm">
						<span className="font-medium text-foreground">{group.name}</span>{" "}
						and all its memberships and pricing rules will be permanently
						deleted.
					</p>
					<div className="mt-5 flex justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="rounded-md border border-border px-4 py-2 text-foreground text-sm hover:bg-muted"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() =>
								deleteMutation.mutate({ params: { id: group.id } })
							}
							disabled={deleteMutation.isPending}
							className="rounded-md bg-destructive px-4 py-2 font-medium text-destructive-foreground text-sm hover:bg-destructive/90 disabled:opacity-50"
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Group form ───────────────────────────────────────────────────────────────

function GroupForm({
	group,
	onSaved,
	onCancel,
}: {
	group?: CustomerGroup;
	onSaved: () => void;
	onCancel: () => void;
}) {
	const api = useGroupsApi();
	const isEditing = !!group;

	const [name, setName] = useState(group?.name ?? "");
	const [slug, setSlug] = useState(group?.slug ?? "");
	const [slugDirty, setSlugDirty] = useState(isEditing);
	const [description, setDescription] = useState(group?.description ?? "");
	const [type, setType] = useState<"manual" | "automatic">(
		group?.isAutomatic ? "automatic" : "manual",
	);
	const [isActive, setIsActive] = useState(group?.isActive ?? true);
	const [priority, setPriority] = useState(String(group?.priority ?? 0));
	const [error, setError] = useState("");

	const createMutation = api.create.useMutation({
		onSuccess: () => {
			void api.list.invalidate();
			onSaved();
		},
		onError: (err: Error) => setError(err.message ?? "Failed to create"),
	});

	const updateMutation = api.update.useMutation({
		onSuccess: () => {
			void api.list.invalidate();
			void api.get.invalidate({ params: { id: group?.id ?? "" } });
			onSaved();
		},
		onError: (err: Error) => setError(err.message ?? "Failed to update"),
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const handleNameChange = (value: string) => {
		setName(value);
		if (!slugDirty) {
			setSlug(slugify(value));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!name.trim()) {
			setError("Name is required.");
			return;
		}
		if (!slug.trim()) {
			setError("Slug is required.");
			return;
		}

		if (isEditing && group) {
			updateMutation.mutate({
				params: { id: group.id },
				name: name.trim(),
				slug: slug.trim(),
				description: description.trim() || undefined,
				type,
				isActive,
				priority: Number(priority) || 0,
			});
		} else {
			createMutation.mutate({
				name: name.trim(),
				slug: slug.trim(),
				description: description.trim() || undefined,
				type,
				priority: Number(priority) || 0,
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-foreground text-xl">
					{isEditing ? "Edit Group" : "New Group"}
				</h2>
				<button
					type="button"
					onClick={onCancel}
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					Cancel
				</button>
			</div>

			<div>
				<label htmlFor="group-name" className={labelCls}>
					Name <span className="text-destructive">*</span>
				</label>
				<input
					id="group-name"
					type="text"
					required
					value={name}
					onChange={(e) => handleNameChange(e.target.value)}
					placeholder="VIP Customers"
					className={inputCls}
				/>
			</div>

			<div>
				<label htmlFor="group-slug" className={labelCls}>
					Slug <span className="text-destructive">*</span>
				</label>
				<input
					id="group-slug"
					type="text"
					required
					value={slug}
					onChange={(e) => {
						setSlug(e.target.value);
						setSlugDirty(true);
					}}
					placeholder="vip-customers"
					className={inputCls}
				/>
			</div>

			<div>
				<label htmlFor="group-desc" className={labelCls}>
					Description
				</label>
				<textarea
					id="group-desc"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="A brief description of this group..."
					rows={3}
					className={inputCls}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label htmlFor="group-type" className={labelCls}>
						Type
					</label>
					<select
						id="group-type"
						value={type}
						onChange={(e) => setType(e.target.value as "manual" | "automatic")}
						className={inputCls}
					>
						<option value="manual">Manual — assign members explicitly</option>
						<option value="automatic">Automatic — rule-based membership</option>
					</select>
				</div>
				<div>
					<label htmlFor="group-priority" className={labelCls}>
						Priority
					</label>
					<input
						id="group-priority"
						type="number"
						min="0"
						max="10000"
						value={priority}
						onChange={(e) => setPriority(e.target.value)}
						className={inputCls}
					/>
					<p className="mt-1 text-muted-foreground text-xs">
						Higher priority groups apply first.
					</p>
				</div>
			</div>

			{isEditing && (
				<div className="flex items-center gap-2">
					<input
						id="group-active"
						type="checkbox"
						checked={isActive}
						onChange={(e) => setIsActive(e.target.checked)}
						className="h-4 w-4 rounded border-border"
					/>
					<label htmlFor="group-active" className="text-foreground text-sm">
						Active
					</label>
				</div>
			)}

			{error && (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			)}

			<div className="flex gap-2">
				<button
					type="submit"
					disabled={isPending}
					className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground text-sm transition-opacity disabled:opacity-60"
				>
					{isPending ? "Saving…" : isEditing ? "Update Group" : "Create Group"}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-border px-5 py-2 font-medium text-foreground text-sm hover:bg-muted"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}

// ─── Add member form ──────────────────────────────────────────────────────────

function AddMemberForm({
	groupId,
	onSaved,
}: {
	groupId: string;
	onSaved: () => void;
}) {
	const api = useGroupsApi();
	const [customerId, setCustomerId] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [error, setError] = useState("");

	const addMutation = api.addMember.useMutation({
		onSuccess: () => {
			void api.listMembers.invalidate({ params: { id: groupId } });
			void api.get.invalidate({ params: { id: groupId } });
			setCustomerId("");
			setExpiresAt("");
			onSaved();
		},
		onError: (err: Error) => setError(err.message ?? "Failed to add member"),
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!customerId.trim()) {
			setError("Customer ID is required.");
			return;
		}
		addMutation.mutate({
			params: { id: groupId },
			customerId: customerId.trim(),
			expiresAt: expiresAt || undefined,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="mt-3 flex flex-wrap gap-2">
			<input
				type="text"
				value={customerId}
				onChange={(e) => setCustomerId(e.target.value)}
				placeholder="Customer ID"
				className="h-8 flex-1 rounded-md border border-input bg-background px-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
			/>
			<input
				type="datetime-local"
				value={expiresAt}
				onChange={(e) => setExpiresAt(e.target.value)}
				title="Expiry (optional)"
				className="h-8 rounded-md border border-input bg-background px-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
			/>
			<button
				type="submit"
				disabled={addMutation.isPending}
				className="h-8 rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm disabled:opacity-60"
			>
				{addMutation.isPending ? "Adding…" : "Add"}
			</button>
			{error && (
				<p className="w-full text-destructive text-xs" role="alert">
					{error}
				</p>
			)}
		</form>
	);
}

// ─── Add pricing form ─────────────────────────────────────────────────────────

function AddPricingForm({
	groupId,
	onSaved,
}: {
	groupId: string;
	onSaved: () => void;
}) {
	const api = useGroupsApi();
	const [adjustmentType, setAdjustmentType] = useState<"percentage" | "fixed">(
		"percentage",
	);
	const [value, setValue] = useState("");
	const [scope, setScope] = useState<"all" | "category" | "product">("all");
	const [scopeId, setScopeId] = useState("");
	const [error, setError] = useState("");

	const setPricingMutation = api.setPricing.useMutation({
		onSuccess: () => {
			void api.listPricing.invalidate({ params: { id: groupId } });
			setValue("");
			setScopeId("");
			onSaved();
		},
		onError: (err: Error) =>
			setError(err.message ?? "Failed to add adjustment"),
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		const numValue = parseFloat(value);
		if (Number.isNaN(numValue) || numValue <= 0) {
			setError("Value must be a positive number.");
			return;
		}
		if (scope !== "all" && !scopeId.trim()) {
			setError("Scope ID is required for category or product scope.");
			return;
		}
		setPricingMutation.mutate({
			params: { id: groupId },
			adjustmentType,
			value: numValue,
			scope,
			scopeId: scope !== "all" ? scopeId.trim() : undefined,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="mt-3 space-y-2">
			<div className="flex flex-wrap gap-2">
				<select
					value={adjustmentType}
					onChange={(e) =>
						setAdjustmentType(e.target.value as "percentage" | "fixed")
					}
					className="h-8 rounded-md border border-input bg-background px-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="percentage">% off</option>
					<option value="fixed">Fixed off</option>
				</select>
				<input
					type="number"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder={adjustmentType === "percentage" ? "10" : "500"}
					min="0.01"
					step="0.01"
					className="h-8 w-24 rounded-md border border-input bg-background px-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
				/>
				<select
					value={scope}
					onChange={(e) =>
						setScope(e.target.value as "all" | "category" | "product")
					}
					className="h-8 rounded-md border border-input bg-background px-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All products</option>
					<option value="category">Category</option>
					<option value="product">Product</option>
				</select>
				{scope !== "all" && (
					<input
						type="text"
						value={scopeId}
						onChange={(e) => setScopeId(e.target.value)}
						placeholder={scope === "category" ? "Category ID" : "Product ID"}
						className="h-8 flex-1 rounded-md border border-input bg-background px-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
					/>
				)}
				<button
					type="submit"
					disabled={setPricingMutation.isPending}
					className="h-8 rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm disabled:opacity-60"
				>
					{setPricingMutation.isPending ? "Adding…" : "Add"}
				</button>
			</div>
			{error && (
				<p className="text-destructive text-xs" role="alert">
					{error}
				</p>
			)}
		</form>
	);
}

// ─── CustomerGroupList ────────────────────────────────────────────────────────

export function CustomerGroupList() {
	const api = useGroupsApi();
	const [deleteTarget, setDeleteTarget] = useState<CustomerGroup | null>(null);
	const [editTarget, setEditTarget] = useState<CustomerGroup | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);

	const { data, isLoading } = api.list.useQuery({}) as {
		data: { groups?: CustomerGroup[] } | undefined;
		isLoading: boolean;
	};

	const groups = data?.groups ?? [];

	if (showCreateForm || editTarget) {
		return (
			<GroupForm
				{...(editTarget ? { group: editTarget } : {})}
				onSaved={() => {
					setShowCreateForm(false);
					setEditTarget(null);
				}}
				onCancel={() => {
					setShowCreateForm(false);
					setEditTarget(null);
				}}
			/>
		);
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">
						Customer Groups
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Segment customers into groups for targeted pricing and promotions
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreateForm(true)}
					className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
				>
					New group
				</button>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : groups.length === 0 ? (
				<div className="rounded-lg border border-border border-dashed bg-card p-12 text-center">
					<p className="font-medium text-foreground text-sm">
						No customer groups yet
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Groups let you segment customers for targeted promotions and
						pricing.
					</p>
					<button
						type="button"
						onClick={() => setShowCreateForm(true)}
						className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
					>
						Create your first group
					</button>
				</div>
			) : (
				<div className="rounded-lg border border-border bg-card">
					<table className="w-full">
						<thead>
							<tr className="border-border border-b text-left">
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Group
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Type
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Members
								</th>
								<th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{groups.map((group) => (
								<tr key={group.id} className="hover:bg-muted/50">
									<td className="px-4 py-3">
										<a
											href={`/admin/customer-groups/${group.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{group.name}
										</a>
										{group.description ? (
											<p className="text-muted-foreground text-xs">
												{group.description}
											</p>
										) : null}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												group.isAutomatic
													? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{group.isAutomatic ? "Automatic" : "Manual"}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										{group.memberCount ?? 0}
									</td>
									<td className="px-4 py-3">
										{group.isActive === false ? (
											<span className="text-muted-foreground text-xs">
												Inactive
											</span>
										) : (
											<span className="text-green-600 text-xs dark:text-green-400">
												Active
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-1">
											<button
												type="button"
												onClick={() => setEditTarget(group)}
												className="rounded-md px-2 py-1 text-foreground text-xs hover:bg-muted"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => setDeleteTarget(group)}
												className="rounded-md px-2 py-1 text-destructive text-xs hover:bg-destructive/10"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{deleteTarget && (
				<DeleteGroupModal
					group={deleteTarget}
					onClose={() => setDeleteTarget(null)}
					onSuccess={() => setDeleteTarget(null)}
				/>
			)}
		</div>
	);
}

// ─── CustomerGroupDetail ──────────────────────────────────────────────────────

export function CustomerGroupDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";
	const api = useGroupsApi();
	const [showEditForm, setShowEditForm] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showAddMember, setShowAddMember] = useState(false);
	const [showAddPricing, setShowAddPricing] = useState(false);
	const [removingMember, setRemovingMember] = useState<string | null>(null);
	const [removingPricing, setRemovingPricing] = useState<string | null>(null);

	const { data, isLoading } = api.get.useQuery({ params: { id } }) as {
		data: { group?: CustomerGroup } | undefined;
		isLoading: boolean;
	};

	const { data: membersData, refetch: refetchMembers } =
		api.listMembers.useQuery({ params: { id } }) as {
			data: { members?: GroupMember[] } | undefined;
			refetch: () => void;
		};

	const { data: pricingData, refetch: refetchPricing } =
		api.listPricing.useQuery({ params: { id } }) as {
			data: { adjustments?: GroupPriceAdjustment[] } | undefined;
			refetch: () => void;
		};

	const removeMemberMutation = api.removeMember.useMutation({
		onSuccess: () => {
			void api.listMembers.invalidate({ params: { id } });
			void api.get.invalidate({ params: { id } });
			setRemovingMember(null);
		},
		onError: () => setRemovingMember(null),
	});

	const removePricingMutation = api.removePricing.useMutation({
		onSuccess: () => {
			void api.listPricing.invalidate({ params: { id } });
			setRemovingPricing(null);
		},
		onError: () => setRemovingPricing(null),
	});

	const group = data?.group;
	const members = membersData?.members ?? [];
	const adjustments = pricingData?.adjustments ?? [];

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/customer-groups"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Customer Groups
					</a>
				</div>
				<div className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-32 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			</div>
		);
	}

	if (!group) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/customer-groups"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Customer Groups
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">Group not found.</p>
				</div>
			</div>
		);
	}

	if (showEditForm) {
		return (
			<div>
				<div className="mb-6">
					<button
						type="button"
						onClick={() => setShowEditForm(false)}
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to {group.name}
					</button>
				</div>
				<GroupForm
					group={group}
					onSaved={() => {
						void api.get.invalidate({ params: { id } });
						setShowEditForm(false);
					}}
					onCancel={() => setShowEditForm(false)}
				/>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/customer-groups"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Customer Groups
				</a>
			</div>

			{/* Header */}
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="font-bold text-2xl text-foreground">{group.name}</h1>
						<span
							className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
								group.isAutomatic
									? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{group.isAutomatic ? "Automatic" : "Manual"}
						</span>
						{group.isActive === false && (
							<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
								Inactive
							</span>
						)}
					</div>
					{group.description ? (
						<p className="mt-1 text-muted-foreground text-sm">
							{group.description}
						</p>
					) : null}
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setShowEditForm(true)}
						className="rounded-lg border border-border px-3 py-1.5 text-foreground text-sm hover:bg-muted"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => setShowDeleteModal(true)}
						className="rounded-lg border border-destructive/30 px-3 py-1.5 text-destructive text-sm hover:bg-destructive/10"
					>
						Delete
					</button>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column */}
				<div className="space-y-6 lg:col-span-2">
					{/* Members */}
					<div className="rounded-lg border border-border bg-card">
						<div className="flex items-center justify-between border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Members ({members.length})
							</h2>
							<button
								type="button"
								onClick={() => setShowAddMember((v) => !v)}
								className="text-muted-foreground text-xs hover:text-foreground"
							>
								{showAddMember ? "Cancel" : "+ Add member"}
							</button>
						</div>

						{showAddMember && (
							<div className="border-border border-b px-4 py-3">
								<AddMemberForm
									groupId={id}
									onSaved={() => {
										setShowAddMember(false);
										refetchMembers();
									}}
								/>
							</div>
						)}

						{members.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No members in this group yet.
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="border-border border-b text-left">
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Customer
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Joined
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Expires
										</th>
										<th className="px-4 py-2" />
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{members.map((m) => (
										<tr key={m.id}>
											<td className="px-4 py-2.5">
												<p className="font-medium text-foreground text-sm">
													{m.customerName ?? m.customerId}
												</p>
												{m.customerEmail ? (
													<p className="text-muted-foreground text-xs">
														{m.customerEmail}
													</p>
												) : null}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm">
												{new Date(m.joinedAt).toLocaleDateString()}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm">
												{m.expiresAt
													? new Date(m.expiresAt).toLocaleDateString()
													: "Never"}
											</td>
											<td className="px-4 py-2.5 text-right">
												<button
													type="button"
													disabled={removingMember === m.customerId}
													onClick={() => {
														setRemovingMember(m.customerId);
														removeMemberMutation.mutate({
															params: { id },
															customerId: m.customerId,
														});
													}}
													className="text-destructive text-xs hover:underline disabled:opacity-50"
												>
													{removingMember === m.customerId
														? "Removing…"
														: "Remove"}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					{/* Pricing adjustments */}
					<div className="rounded-lg border border-border bg-card">
						<div className="flex items-center justify-between border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Pricing Adjustments ({adjustments.length})
							</h2>
							<button
								type="button"
								onClick={() => setShowAddPricing((v) => !v)}
								className="text-muted-foreground text-xs hover:text-foreground"
							>
								{showAddPricing ? "Cancel" : "+ Add adjustment"}
							</button>
						</div>

						{showAddPricing && (
							<div className="border-border border-b px-4 py-3">
								<AddPricingForm
									groupId={id}
									onSaved={() => {
										setShowAddPricing(false);
										refetchPricing();
									}}
								/>
							</div>
						)}

						{adjustments.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No pricing adjustments. Add one to give this group discounts.
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="border-border border-b text-left">
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Discount
										</th>
										<th className="px-4 py-2 font-medium text-muted-foreground text-xs">
											Scope
										</th>
										<th className="px-4 py-2" />
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{adjustments.map((adj) => (
										<tr key={adj.id}>
											<td className="px-4 py-2.5 font-medium text-foreground text-sm">
												{adj.adjustmentType === "percentage"
													? `${adj.value}% off`
													: `$${(adj.value / 100).toFixed(2)} off`}
											</td>
											<td className="px-4 py-2.5 text-muted-foreground text-sm capitalize">
												{adj.scope}
												{adj.scopeId ? `: ${adj.scopeId.slice(0, 8)}…` : ""}
											</td>
											<td className="px-4 py-2.5 text-right">
												<button
													type="button"
													disabled={removingPricing === adj.id}
													onClick={() => {
														setRemovingPricing(adj.id);
														removePricingMutation.mutate({
															params: { adjustmentId: adj.id },
														});
													}}
													className="text-destructive text-xs hover:underline disabled:opacity-50"
												>
													{removingPricing === adj.id ? "Removing…" : "Remove"}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>

				{/* Right column — details */}
				<div className="space-y-6">
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Slug</dt>
								<dd className="font-medium font-mono text-foreground">
									{group.slug}
								</dd>
							</div>
							{group.priority != null ? (
								<div>
									<dt className="text-muted-foreground">Priority</dt>
									<dd className="font-medium text-foreground">
										{group.priority}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Members</dt>
								<dd className="font-medium text-foreground">
									{group.memberCount ?? members.length}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Created</dt>
								<dd className="font-medium text-foreground">
									{new Date(group.createdAt).toLocaleDateString()}
								</dd>
							</div>
							{group.updatedAt ? (
								<div>
									<dt className="text-muted-foreground">Updated</dt>
									<dd className="font-medium text-foreground">
										{new Date(group.updatedAt).toLocaleDateString()}
									</dd>
								</div>
							) : null}
						</dl>
					</div>
				</div>
			</div>

			{showDeleteModal && (
				<DeleteGroupModal
					group={group}
					onClose={() => setShowDeleteModal(false)}
					onSuccess={() => {
						window.location.href = "/admin/customer-groups";
					}}
				/>
			)}
		</div>
	);
}
