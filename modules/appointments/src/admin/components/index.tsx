"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Appointment {
	id: string;
	customerId: string;
	serviceId: string;
	staffId?: string;
	status: string;
	startsAt: string;
	endsAt: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

interface Service {
	id: string;
	name: string;
	slug: string;
	description?: string;
	duration: number;
	price: number;
	currency: string;
	status: string;
	maxCapacity?: number;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface Staff {
	id: string;
	name: string;
	email: string;
	bio?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface AppointmentStats {
	totalAppointments: number;
	pendingAppointments: number;
	confirmedAppointments: number;
	completedAppointments: number;
	cancelledAppointments: number;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useAppointmentsApi() {
	const client = useModuleClient();
	return {
		listAppointments:
			client.module("appointments").admin["/admin/appointments"],
		getAppointment:
			client.module("appointments").admin["/admin/appointments/:id"],
		updateAppointment:
			client.module("appointments").admin["/admin/appointments/:id/update"],
		stats: client.module("appointments").admin["/admin/appointments/stats"],
		listServices:
			client.module("appointments").admin["/admin/appointments/services"],
		createService:
			client.module("appointments").admin[
				"/admin/appointments/services/create"
			],
		updateService:
			client.module("appointments").admin[
				"/admin/appointments/services/:id/update"
			],
		deleteService:
			client.module("appointments").admin[
				"/admin/appointments/services/:id/delete"
			],
		listStaff: client.module("appointments").admin["/admin/appointments/staff"],
		createStaff:
			client.module("appointments").admin["/admin/appointments/staff/create"],
		updateStaff:
			client.module("appointments").admin[
				"/admin/appointments/staff/:id/update"
			],
		deleteStaff:
			client.module("appointments").admin[
				"/admin/appointments/staff/:id/delete"
			],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	completed:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	"no-show": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
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

function formatCurrency(amount: number, currency = "USD") {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
	}).format(amount / 100);
}

function formatDuration(minutes: number) {
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
// AppointmentList — main appointment list + stats
// ---------------------------------------------------------------------------

export function AppointmentList() {
	const api = useAppointmentsApi();
	const [statusFilter, setStatusFilter] = useState("");

	const { data, isLoading } = api.listAppointments.useQuery({
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { appointments?: Appointment[] } | undefined;
		isLoading: boolean;
	};
	const { data: statsData } = api.stats.useQuery({}) as {
		data: { stats?: AppointmentStats } | undefined;
	};

	const appointments = data?.appointments ?? [];
	const stats = statsData?.stats;

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">Appointments</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage customer appointments
				</p>
			</div>

			{/* Stats */}
			{stats ? (
				<div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total
						</p>
						<p className="mt-1 font-bold text-2xl text-foreground">
							{stats.totalAppointments}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-1 font-bold text-2xl text-yellow-600">
							{stats.pendingAppointments}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Confirmed
						</p>
						<p className="mt-1 font-bold text-2xl text-blue-600">
							{stats.confirmedAppointments}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Completed
						</p>
						<p className="mt-1 font-bold text-2xl text-green-600">
							{stats.completedAppointments}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Cancelled
						</p>
						<p className="mt-1 font-bold text-2xl text-red-600">
							{stats.cancelledAppointments}
						</p>
					</div>
				</div>
			) : null}

			{/* Filter */}
			<div className="mb-4">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				>
					<option value="">All statuses</option>
					<option value="pending">Pending</option>
					<option value="confirmed">Confirmed</option>
					<option value="cancelled">Cancelled</option>
					<option value="completed">Completed</option>
					<option value="no-show">No Show</option>
				</select>
			</div>

			{/* Appointment list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : appointments.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No appointments found.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{appointments.map((appt) => (
						<a
							key={appt.id}
							href={`/admin/appointments/${appt.id}`}
							className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{formatDateTime(appt.startsAt)}
										</p>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[appt.status] ?? "bg-muted text-muted-foreground"}`}
										>
											{appt.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>Customer: {appt.customerId.slice(0, 8)}...</span>
										<span>Service: {appt.serviceId.slice(0, 8)}...</span>
										{appt.staffId ? (
											<span>Staff: {appt.staffId.slice(0, 8)}...</span>
										) : null}
										{appt.notes ? <span>{appt.notes}</span> : null}
									</div>
								</div>
								<span className="whitespace-nowrap text-muted-foreground text-xs">
									{formatDate(appt.createdAt)}
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
// AppointmentDetail — single appointment view + status update
// ---------------------------------------------------------------------------

export function AppointmentDetail({ params }: { params: { id: string } }) {
	const api = useAppointmentsApi();

	const { data, isLoading } = api.getAppointment.useQuery({
		params: { id: params.id },
	}) as {
		data: { appointment?: Appointment; error?: string } | undefined;
		isLoading: boolean;
	};

	const updateMutation = api.updateAppointment.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const appointment = data?.appointment;

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

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (!appointment) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Appointment not found.</p>
				<a
					href="/admin/appointments"
					className="mt-2 inline-block text-sm underline"
				>
					Back to appointments
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/appointments"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to appointments
				</a>
				<div className="mt-2 flex items-center gap-3">
					<h1 className="font-bold text-foreground text-xl">
						Appointment Details
					</h1>
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[appointment.status] ?? "bg-muted text-muted-foreground"}`}
					>
						{appointment.status}
					</span>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Details
					</h2>
					<dl className="space-y-3 text-sm">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Start</dt>
							<dd className="text-foreground">
								{formatDateTime(appointment.startsAt)}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">End</dt>
							<dd className="text-foreground">
								{formatDateTime(appointment.endsAt)}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Customer</dt>
							<dd className="font-mono text-foreground text-xs">
								{appointment.customerId}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Service</dt>
							<dd className="font-mono text-foreground text-xs">
								{appointment.serviceId}
							</dd>
						</div>
						{appointment.staffId ? (
							<div className="flex justify-between">
								<dt className="text-muted-foreground">Staff</dt>
								<dd className="font-mono text-foreground text-xs">
									{appointment.staffId}
								</dd>
							</div>
						) : null}
						{appointment.notes ? (
							<div className="flex justify-between">
								<dt className="text-muted-foreground">Notes</dt>
								<dd className="text-foreground">{appointment.notes}</dd>
							</div>
						) : null}
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Created</dt>
							<dd className="text-foreground">
								{formatDateTime(appointment.createdAt)}
							</dd>
						</div>
					</dl>
				</div>

				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Update Status
					</h2>
					<div className="space-y-2">
						<label className="block text-sm">
							<span className="mb-1 block text-muted-foreground">Status</span>
							<select
								value={appointment.status}
								onChange={(e) => handleStatusChange(e.target.value)}
								disabled={updateMutation.isPending}
								className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
							>
								<option value="pending">Pending</option>
								<option value="confirmed">Confirmed</option>
								<option value="cancelled">Cancelled</option>
								<option value="completed">Completed</option>
								<option value="no-show">No Show</option>
							</select>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// ServiceList — service management + create
// ---------------------------------------------------------------------------

export function ServiceList() {
	const api = useAppointmentsApi();
	const [showCreate, setShowCreate] = useState(false);
	const [svcName, setSvcName] = useState("");
	const [svcSlug, setSvcSlug] = useState("");
	const [svcDuration, setSvcDuration] = useState(60);
	const [svcPrice, setSvcPrice] = useState(0);
	const [svcDescription, setSvcDescription] = useState("");
	const [error, setError] = useState("");

	const { data, isLoading } = api.listServices.useQuery({}) as {
		data: { services?: Service[] } | undefined;
		isLoading: boolean;
	};

	const createMutation = api.createService.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.deleteService.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const services = data?.services ?? [];

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!svcName.trim()) {
			setError("Service name is required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					name: svcName.trim(),
					slug: svcSlug.trim() || slugify(svcName),
					duration: svcDuration,
					price: svcPrice,
					description: svcDescription.trim() || undefined,
				},
			});
			setSvcName("");
			setSvcSlug("");
			setSvcDuration(60);
			setSvcPrice(0);
			setSvcDescription("");
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this service?")) return;
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
					<h1 className="font-bold text-2xl text-foreground">Services</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage appointment services
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Add Service"}
				</button>
			</div>

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Service
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
									value={svcName}
									onChange={(e) => {
										setSvcName(e.target.value);
										if (!svcSlug) setSvcSlug(slugify(e.target.value));
									}}
									placeholder="Haircut"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Slug</span>
								<input
									type="text"
									value={svcSlug}
									onChange={(e) => setSvcSlug(e.target.value)}
									placeholder="haircut"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Duration (minutes)
								</span>
								<input
									type="number"
									value={svcDuration}
									onChange={(e) =>
										setSvcDuration(Number.parseInt(e.target.value, 10) || 0)
									}
									min={1}
									max={1440}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">
									Price (cents)
								</span>
								<input
									type="number"
									value={svcPrice}
									onChange={(e) =>
										setSvcPrice(Number.parseInt(e.target.value, 10) || 0)
									}
									min={0}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">
								Description
							</span>
							<input
								type="text"
								value={svcDescription}
								onChange={(e) => setSvcDescription(e.target.value)}
								placeholder="Optional description"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Create Service"}
						</button>
					</form>
				</div>
			) : null}

			{/* Service list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : services.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No services yet. Create one to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{services.map((svc) => (
						<div
							key={svc.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{svc.name}
										</p>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												svc.status === "active"
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{svc.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{formatDuration(svc.duration)}</span>
										<span>{formatCurrency(svc.price, svc.currency)}</span>
										{svc.description ? <span>{svc.description}</span> : null}
										{svc.maxCapacity ? (
											<span>Max {svc.maxCapacity} slots</span>
										) : null}
									</div>
								</div>
								<button
									type="button"
									onClick={() => handleDelete(svc.id)}
									className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// StaffList — staff management + create
// ---------------------------------------------------------------------------

export function StaffList() {
	const api = useAppointmentsApi();
	const [showCreate, setShowCreate] = useState(false);
	const [staffName, setStaffName] = useState("");
	const [staffEmail, setStaffEmail] = useState("");
	const [staffBio, setStaffBio] = useState("");
	const [error, setError] = useState("");

	const { data, isLoading } = api.listStaff.useQuery({}) as {
		data: { staff?: Staff[] } | undefined;
		isLoading: boolean;
	};

	const createMutation = api.createStaff.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const deleteMutation = api.deleteStaff.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const staff = data?.staff ?? [];

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!staffName.trim() || !staffEmail.trim()) {
			setError("Name and email are required.");
			return;
		}
		try {
			await createMutation.mutateAsync({
				body: {
					name: staffName.trim(),
					email: staffEmail.trim(),
					bio: staffBio.trim() || undefined,
				},
			});
			setStaffName("");
			setStaffEmail("");
			setStaffBio("");
			setShowCreate(false);
			window.location.reload();
		} catch (err) {
			setError(extractError(err));
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this staff member?")) return;
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
					<h1 className="font-bold text-2xl text-foreground">Staff</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage appointment staff members
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreate(!showCreate)}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					{showCreate ? "Cancel" : "Add Staff"}
				</button>
			</div>

			{/* Create form */}
			{showCreate ? (
				<div className="mb-6 rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						New Staff Member
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
									value={staffName}
									onChange={(e) => setStaffName(e.target.value)}
									placeholder="Jane Smith"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block font-medium text-sm">Email</span>
								<input
									type="email"
									value={staffEmail}
									onChange={(e) => setStaffEmail(e.target.value)}
									placeholder="jane@example.com"
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<label className="block">
							<span className="mb-1 block font-medium text-sm">Bio</span>
							<input
								type="text"
								value={staffBio}
								onChange={(e) => setStaffBio(e.target.value)}
								placeholder="Optional bio"
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
							/>
						</label>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
						>
							{createMutation.isPending ? "Creating..." : "Add Staff Member"}
						</button>
					</form>
				</div>
			) : null}

			{/* Staff list */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : staff.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No staff members yet. Add one to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{staff.map((s) => (
						<div
							key={s.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{s.name}
										</p>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												s.status === "active"
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{s.status}
										</span>
									</div>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
										<span>{s.email}</span>
										{s.bio ? <span>{s.bio}</span> : null}
									</div>
								</div>
								<button
									type="button"
									onClick={() => handleDelete(s.id)}
									className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
