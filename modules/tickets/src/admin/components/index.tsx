"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Ticket {
	id: string;
	number: number;
	categoryId?: string;
	subject: string;
	description: string;
	status: string;
	priority: string;
	customerEmail: string;
	customerName: string;
	customerId?: string;
	orderId?: string;
	assigneeId?: string;
	assigneeName?: string;
	tags?: string[];
	closedAt?: string;
	createdAt: string;
	updatedAt: string;
}

interface TicketMessage {
	id: string;
	ticketId: string;
	body: string;
	authorType: string;
	authorId?: string;
	authorName: string;
	authorEmail?: string;
	isInternal: boolean;
	createdAt: string;
}

interface TicketCategory {
	id: string;
	name: string;
	slug: string;
	description?: string;
	position: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface TicketStats {
	total: number;
	open: number;
	pending: number;
	inProgress: number;
	resolved: number;
	closed: number;
	byPriority: Record<string, number>;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useTicketsApi() {
	const client = useModuleClient();
	return {
		listTickets: client.module("tickets").admin["/admin/tickets"],
		getTicket: client.module("tickets").admin["/admin/tickets/:id"],
		updateTicket: client.module("tickets").admin["/admin/tickets/:id/update"],
		closeTicket: client.module("tickets").admin["/admin/tickets/:id/close"],
		reopenTicket: client.module("tickets").admin["/admin/tickets/:id/reopen"],
		adminReply: client.module("tickets").admin["/admin/tickets/:id/reply"],
		listMessages: client.module("tickets").admin["/admin/tickets/:id/messages"],
		stats: client.module("tickets").admin["/admin/tickets/stats"],
		listCategories: client.module("tickets").admin["/admin/tickets/categories"],
		createCategory:
			client.module("tickets").admin["/admin/tickets/categories/create"],
		updateCategory:
			client.module("tickets").admin["/admin/tickets/categories/:id"],
		deleteCategory:
			client.module("tickets").admin["/admin/tickets/categories/:id/delete"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	"in-progress":
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
	resolved:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
	open: "Open",
	pending: "Pending",
	"in-progress": "In Progress",
	resolved: "Resolved",
	closed: "Closed",
};

const PRIORITY_COLORS: Record<string, string> = {
	low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
	normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
	high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
	urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_LABELS: Record<string, string> = {
	low: "Low",
	normal: "Normal",
	high: "High",
	urgent: "Urgent",
};

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatDateTime(dateStr: string) {
	return new Date(dateStr).toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

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
// TicketList — main tickets page
// ---------------------------------------------------------------------------

export function TicketList() {
	const api = useTicketsApi();
	const [statusFilter, setStatusFilter] = useState("");
	const [priorityFilter, setPriorityFilter] = useState("");

	const { data, isLoading } = api.listTickets.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
		...(priorityFilter ? { priority: priorityFilter } : {}),
	}) as {
		data: { tickets?: Ticket[] } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: TicketStats } | undefined;
	};

	const tickets = data?.tickets ?? [];
	const stats = statsData?.stats;

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">Tickets</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage customer support tickets
				</p>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.total}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Open
						</p>
						<p className="mt-1 font-bold text-2xl text-blue-600">
							{stats.open}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{stats.pending}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							In Progress
						</p>
						<p className="mt-1 font-bold text-2xl text-indigo-600">
							{stats.inProgress}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Resolved
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.resolved}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Closed
						</p>
						<p className="mt-1 font-bold text-2xl text-gray-600">
							{stats.closed}
						</p>
					</div>
				</div>
			) : null}

			{/* Filters */}
			<div className="mb-4 flex gap-2">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="open">Open</option>
					<option value="pending">Pending</option>
					<option value="in-progress">In Progress</option>
					<option value="resolved">Resolved</option>
					<option value="closed">Closed</option>
				</select>
				<select
					value={priorityFilter}
					onChange={(e) => setPriorityFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All priorities</option>
					<option value="low">Low</option>
					<option value="normal">Normal</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
			</div>

			{/* Ticket list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : tickets.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">No tickets found.</p>
				</div>
			) : (
				<div className="space-y-3">
					{tickets.map((ticket) => (
						<a
							key={ticket.id}
							href={`/admin/tickets/${ticket.id}`}
							className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-mono text-muted-foreground text-xs">
											#{ticket.number}
										</span>
										<p className="font-medium text-foreground text-sm">
											{ticket.subject}
										</p>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{STATUS_LABELS[ticket.status] ?? ticket.status}
										</span>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${PRIORITY_COLORS[ticket.priority] ?? "bg-muted text-muted-foreground"}`}
										>
											{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
										</span>
										<span className="text-muted-foreground text-xs">
											{ticket.customerName} &lt;
											{ticket.customerEmail}&gt;
										</span>
										{ticket.assigneeName ? (
											<span className="text-muted-foreground text-xs">
												Assigned to {ticket.assigneeName}
											</span>
										) : null}
									</div>
								</div>
								<span className="whitespace-nowrap text-muted-foreground text-xs">
									{formatDate(ticket.createdAt)}
								</span>
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// TicketDetail — single ticket view with message thread
// ---------------------------------------------------------------------------

export function TicketDetail({ params }: { params: { id: string } }) {
	const api = useTicketsApi();
	const [replyBody, setReplyBody] = useState("");
	const [isInternal, setIsInternal] = useState(false);
	const [error, setError] = useState("");

	const { data, isLoading } = api.getTicket.useQuery({
		params: { id: params.id },
	}) as {
		data:
			| { ticket?: Ticket; messages?: TicketMessage[]; error?: string }
			| undefined;
		isLoading: boolean;
	};

	const replyMutation = api.adminReply.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};
	const closeMutation = api.closeTicket.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const reopenMutation = api.reopenTicket.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const updateMutation = api.updateTicket.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const ticket = data?.ticket;
	const messages = data?.messages ?? [];

	const handleReply = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!replyBody.trim()) {
			setError("Reply body is required.");
			return;
		}
		try {
			await replyMutation.mutateAsync({
				params: { id: params.id },
				body: {
					body: replyBody.trim(),
					authorName: "Admin",
					isInternal,
				},
			});
			setReplyBody("");
			setIsInternal(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleClose = async () => {
		try {
			await closeMutation.mutateAsync({ params: { id: params.id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleReopen = async () => {
		try {
			await reopenMutation.mutateAsync({ params: { id: params.id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		try {
			await updateMutation.mutateAsync({
				params: { id: params.id },
				body: { status: newStatus },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handlePriorityChange = async (newPriority: string) => {
		try {
			await updateMutation.mutateAsync({
				params: { id: params.id },
				body: { priority: newPriority },
			});
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
				<div className="h-24 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (!ticket) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Ticket not found.</p>
				<a
					href="/admin/tickets"
					className="mt-2 inline-block text-sm underline"
				>
					Back to tickets
				</a>
			</div>
		);
	}

	const isClosed = ticket.status === "closed";

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<a
					href="/admin/tickets"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to tickets
				</a>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2">
							<span className="font-mono text-muted-foreground text-sm">
								#{ticket.number}
							</span>
							<h1 className="font-bold text-foreground text-xl">
								{ticket.subject}
							</h1>
						</div>
						<div className="mt-1.5 flex flex-wrap items-center gap-2">
							<span
								className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground"}`}
							>
								{STATUS_LABELS[ticket.status] ?? ticket.status}
							</span>
							<span
								className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${PRIORITY_COLORS[ticket.priority] ?? "bg-muted text-muted-foreground"}`}
							>
								{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
							</span>
						</div>
					</div>
					<div className="flex gap-2">
						{isClosed ? (
							<button
								type="button"
								onClick={handleReopen}
								disabled={reopenMutation.isPending}
								className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-sm hover:bg-muted disabled:opacity-50"
							>
								Reopen
							</button>
						) : (
							<button
								type="button"
								onClick={handleClose}
								disabled={closeMutation.isPending}
								className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-sm hover:bg-muted disabled:opacity-50"
							>
								Close
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Message thread */}
				<div className="lg:col-span-2">
					{/* Original ticket description */}
					<div className="mb-4 rounded-lg border border-border bg-card p-4">
						<div className="mb-2 flex items-center justify-between">
							<span className="font-medium text-foreground text-sm">
								{ticket.customerName}
							</span>
							<span className="text-muted-foreground text-xs">
								{formatDateTime(ticket.createdAt)}
							</span>
						</div>
						<p className="whitespace-pre-wrap text-foreground text-sm">
							{ticket.description}
						</p>
					</div>

					{/* Messages */}
					{messages.length > 0 ? (
						<div className="space-y-3">
							{messages.map((msg) => (
								<div
									key={msg.id}
									className={`rounded-lg border p-4 ${
										msg.isInternal
											? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-900/10"
											: msg.authorType === "admin"
												? "border-border bg-muted/30"
												: "border-border bg-card"
									}`}
								>
									<div className="mb-2 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="font-medium text-foreground text-sm">
												{msg.authorName}
											</span>
											<span
												className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium text-xs ${
													msg.authorType === "admin"
														? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
														: msg.authorType === "system"
															? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
															: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
												}`}
											>
												{msg.authorType}
											</span>
											{msg.isInternal ? (
												<span className="inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 font-medium text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
													Internal
												</span>
											) : null}
										</div>
										<span className="text-muted-foreground text-xs">
											{formatDateTime(msg.createdAt)}
										</span>
									</div>
									<p className="whitespace-pre-wrap text-foreground text-sm">
										{msg.body}
									</p>
								</div>
							))}
						</div>
					) : null}

					{/* Reply form */}
					{!isClosed ? (
						<div className="mt-4 rounded-lg border border-border bg-card p-4">
							<h3 className="mb-3 font-semibold text-foreground text-sm">
								Reply
							</h3>
							{error ? (
								<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
									{error}
								</div>
							) : null}
							<form onSubmit={handleReply} className="space-y-3">
								<textarea
									value={replyBody}
									onChange={(e) => setReplyBody(e.target.value)}
									placeholder="Write your reply..."
									rows={4}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
								<div className="flex items-center justify-between">
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={isInternal}
											onChange={(e) => setIsInternal(e.target.checked)}
											className="rounded border-border"
										/>
										<span className="text-muted-foreground">
											Internal note (not visible to customer)
										</span>
									</label>
									<button
										type="submit"
										disabled={replyMutation.isPending}
										className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
									>
										{replyMutation.isPending ? "Sending..." : "Send Reply"}
									</button>
								</div>
							</form>
						</div>
					) : null}
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					{/* Customer info */}
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Customer
						</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Name</dt>
								<dd className="text-foreground">{ticket.customerName}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Email</dt>
								<dd className="text-foreground">{ticket.customerEmail}</dd>
							</div>
							{ticket.orderId ? (
								<div>
									<dt className="text-muted-foreground">Order</dt>
									<dd className="text-foreground">{ticket.orderId}</dd>
								</div>
							) : null}
						</dl>
					</div>

					{/* Ticket details */}
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<div className="space-y-3">
							<label className="block text-sm">
								<span className="mb-1 block text-muted-foreground">Status</span>
								<select
									value={ticket.status}
									onChange={(e) => handleStatusChange(e.target.value)}
									disabled={isClosed}
									className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
								>
									<option value="open">Open</option>
									<option value="pending">Pending</option>
									<option value="in-progress">In Progress</option>
									<option value="resolved">Resolved</option>
								</select>
							</label>
							<label className="block text-sm">
								<span className="mb-1 block text-muted-foreground">
									Priority
								</span>
								<select
									value={ticket.priority}
									onChange={(e) => handlePriorityChange(e.target.value)}
									className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								>
									<option value="low">Low</option>
									<option value="normal">Normal</option>
									<option value="high">High</option>
									<option value="urgent">Urgent</option>
								</select>
							</label>
							{ticket.assigneeName ? (
								<div className="text-sm">
									<span className="block text-muted-foreground">Assignee</span>
									<span className="text-foreground">{ticket.assigneeName}</span>
								</div>
							) : null}
							{ticket.tags && ticket.tags.length > 0 ? (
								<div className="text-sm">
									<span className="block text-muted-foreground">Tags</span>
									<div className="mt-1 flex flex-wrap gap-1">
										{ticket.tags.map((tag) => (
											<span
												key={tag}
												className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							) : null}
							<div className="text-sm">
								<span className="block text-muted-foreground">Created</span>
								<span className="text-foreground">
									{formatDateTime(ticket.createdAt)}
								</span>
							</div>
							{ticket.closedAt ? (
								<div className="text-sm">
									<span className="block text-muted-foreground">Closed</span>
									<span className="text-foreground">
										{formatDateTime(ticket.closedAt)}
									</span>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TicketCategories — category list + create
// ---------------------------------------------------------------------------

export function TicketCategories() {
	const api = useTicketsApi();
	const [showCreate, setShowCreate] = useState(false);
	const [newName, setNewName] = useState("");
	const [newSlug, setNewSlug] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newPosition, setNewPosition] = useState(0);
	const [error, setError] = useState("");

	const { data, isLoading } = api.listCategories.useQuery({}) as {
		data: { categories?: TicketCategory[] } | undefined;
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
					position: newPosition,
				},
			});
			setNewName("");
			setNewSlug("");
			setNewDescription("");
			setNewPosition(0);
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (
			!confirm(
				"Delete this category? Tickets in this category will be uncategorized.",
			)
		)
			return;
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
					<h1 className="font-bold text-2xl text-foreground">
						Ticket Categories
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Organize tickets by category
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
						New Category
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
									placeholder="Shipping Issues"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={newSlug}
									onChange={(e) => setNewSlug(e.target.value)}
									placeholder="shipping-issues"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Description
								</span>
								<input
									type="text"
									value={newDescription}
									onChange={(e) => setNewDescription(e.target.value)}
									placeholder="Optional description"
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
						No categories yet. Create one to organize tickets.
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
											href={`/admin/tickets/categories/${cat.id}`}
											className="font-medium text-foreground text-sm hover:underline"
										>
											{cat.name}
										</a>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												cat.isActive
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{cat.isActive ? "Active" : "Inactive"}
										</span>
									</div>
									<p className="mt-1 text-muted-foreground text-xs">
										Slug: {cat.slug}
										{cat.description ? ` \u00B7 ${cat.description}` : ""}
										{` \u00B7 Position: ${cat.position}`}
									</p>
								</div>
								<div className="flex gap-1">
									<a
										href={`/admin/tickets/categories/${cat.id}`}
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
// TicketCategoryDetail — edit a single category
// ---------------------------------------------------------------------------

export function TicketCategoryDetail({ params }: { params: { id: string } }) {
	const api = useTicketsApi();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [position, setPosition] = useState(0);
	const [isActive, setIsActive] = useState(true);
	const [initialized, setInitialized] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	const { data, isLoading } = api.listCategories.useQuery({}) as {
		data: { categories?: TicketCategory[] } | undefined;
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
		setPosition(category.position);
		setIsActive(category.isActive);
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
					position,
					isActive,
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
					href="/admin/tickets/categories"
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
					href="/admin/tickets/categories"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to categories
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					Edit Category
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
				<label className="block">
					<span className="mb-1 block font-medium text-sm">Description</span>
					<input
						type="text"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Optional description"
						className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
					/>
				</label>
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
							checked={isActive}
							onChange={(e) => setIsActive(e.target.checked)}
							className="rounded border-border"
						/>
						<span className="font-medium text-sm">Active</span>
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
