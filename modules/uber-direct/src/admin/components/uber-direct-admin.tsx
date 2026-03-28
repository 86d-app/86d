"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import UberDirectAdminTemplate from "./uber-direct-admin.mdx";

// ── Types ────────────────────────────────────────────────────────────────────

interface UberDirectSettings {
	status: "connected" | "not_configured" | "error";
	error?: string | undefined;
	accountName?: string | undefined;
	configured: boolean;
	clientIdMasked: string | null;
	customerIdMasked: string | null;
}

interface DeliveryItem {
	id: string;
	orderId: string;
	status: string;
	fee: number;
	tip: number;
	courierName?: string;
	trackingUrl?: string;
	createdAt: string;
}

interface DeliveryStats {
	totalDeliveries: number;
	totalPending: number;
	totalAccepted: number;
	totalPickedUp: number;
	totalDelivered: number;
	totalCancelled: number;
	totalFailed: number;
	totalFees: number;
	totalTips: number;
}

// ── API hook ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function useUberDirectAdminApi() {
	const client = useModuleClient();
	const mod = client.module("uber-direct");
	return {
		getSettings: mod.admin["/admin/uber-direct/settings"],
		list: mod.admin["/admin/uber-direct/deliveries"],
		updateStatus: mod.admin["/admin/uber-direct/deliveries/:id/status"],
		quotes: mod.admin["/admin/uber-direct/quotes"],
		stats: mod.admin["/admin/uber-direct/stats"],
	};
}

// ── Reusable components ──────────────────────────────────────────────────────

function SettingsCard({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-border bg-card p-5">
			<h3 className="mb-3 font-semibold text-foreground text-sm">{label}</h3>
			{children}
		</div>
	);
}

function StatusRow({
	label,
	value,
	mono,
	badge,
	badgeClass,
}: {
	label: string;
	value: string;
	mono?: boolean;
	badge?: string;
	badgeClass?: string;
}) {
	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-muted-foreground text-sm">{label}</span>
			<div className="flex items-center gap-2">
				{badge && (
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${badgeClass ?? "bg-muted text-muted-foreground"}`}
					>
						{badge}
					</span>
				)}
				<span
					className={`text-foreground text-sm ${mono ? "font-mono text-xs" : ""}`}
				>
					{value}
				</span>
			</div>
		</div>
	);
}

function StatBlock({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="flex flex-col items-center rounded-lg border border-border bg-card p-4">
			<span className={`font-bold text-2xl ${color}`}>{value}</span>
			<span className="mt-1 text-muted-foreground text-xs">{label}</span>
		</div>
	);
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	quoted:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
	accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	"picked-up":
		"bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
	delivered:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
	failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ── Main component ───────────────────────────────────────────────────────────

export function UberDirectAdmin() {
	const api = useUberDirectAdminApi();
	const [skip, setSkip] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");

	// ── Settings ─────────────────────────────────────────────────────────
	const { data: settingsData, isLoading: settingsLoading } =
		api.getSettings.useQuery({}) as {
			data: UberDirectSettings | undefined;
			isLoading: boolean;
		};

	// ── Stats ────────────────────────────────────────────────────────────
	const { data: statsData, isLoading: statsLoading } = api.stats.useQuery(
		{},
	) as {
		data: { stats: DeliveryStats } | undefined;
		isLoading: boolean;
	};

	// ── Deliveries ───────────────────────────────────────────────────────
	const { data: listData, isLoading: deliveriesLoading } = api.list.useQuery({
		take: String(PAGE_SIZE),
		skip: String(skip),
		...(statusFilter ? { status: statusFilter } : {}),
	}) as {
		data: { deliveries: DeliveryItem[]; total: number } | undefined;
		isLoading: boolean;
	};

	// ── Loading skeleton ─────────────────────────────────────────────────
	if (settingsLoading) {
		return (
			<UberDirectAdminTemplate>
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="h-32 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			</UberDirectAdminTemplate>
		);
	}

	const settings = settingsData;
	const stats = statsData?.stats;
	const deliveries = listData?.deliveries ?? [];
	const total = listData?.total ?? 0;

	return (
		<UberDirectAdminTemplate>
			<div className="space-y-6">
				{/* ── Connection settings ────────────────────────────── */}
				<SettingsCard label="Connection">
					<div className="divide-y divide-border">
						<StatusRow
							label="Status"
							value={
								settings?.status === "connected"
									? (settings.accountName ?? "Connected")
									: settings?.status === "error"
										? "Error"
										: "Not configured"
							}
							badge={
								settings?.status === "connected"
									? "connected"
									: settings?.status === "error"
										? "error"
										: "inactive"
							}
							badgeClass={
								settings?.status === "connected"
									? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
									: settings?.status === "error"
										? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
										: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
							}
						/>
						{settings?.clientIdMasked && (
							<StatusRow
								label="Client ID"
								value={settings.clientIdMasked}
								mono
							/>
						)}
						{settings?.customerIdMasked && (
							<StatusRow
								label="Customer ID"
								value={settings.customerIdMasked}
								mono
							/>
						)}
						<StatusRow
							label="Webhook endpoint"
							value="/api/store/uber-direct/webhook"
							mono
						/>
					</div>

					{settings?.status === "error" && settings.error && (
						<div className="mt-3 rounded-md bg-red-50 p-3 text-red-800 text-sm dark:bg-red-900/20 dark:text-red-300">
							{settings.error}
						</div>
					)}

					{settings?.status === "not_configured" && (
						<div className="mt-3 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
							Add your Uber Direct client ID, client secret, and customer ID to
							the module configuration to enable delivery integration.
						</div>
					)}
				</SettingsCard>

				{/* ── Delivery stats ─────────────────────────────────── */}
				<SettingsCard label="Delivery overview">
					{statsLoading ? (
						<div className="grid grid-cols-4 gap-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={`stat-skel-${i}`}
									className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
								/>
							))}
						</div>
					) : stats && stats.totalDeliveries > 0 ? (
						<div className="grid grid-cols-4 gap-3">
							<StatBlock
								label="Total"
								value={stats.totalDeliveries}
								color="text-foreground"
							/>
							<StatBlock
								label="Delivered"
								value={stats.totalDelivered}
								color="text-green-600 dark:text-green-400"
							/>
							<StatBlock
								label="Pending"
								value={stats.totalPending}
								color="text-yellow-600 dark:text-yellow-400"
							/>
							<StatBlock
								label="Failed"
								value={stats.totalFailed}
								color="text-red-600 dark:text-red-400"
							/>
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							No delivery activity yet. Stats will appear here once Uber Direct
							deliveries start flowing.
						</p>
					)}
				</SettingsCard>

				{/* ── Deliveries list ────────────────────────────────── */}
				<SettingsCard label="Recent deliveries">
					<div className="mb-3 flex items-center justify-between">
						<p className="text-muted-foreground text-xs">
							All deliveries dispatched through Uber Direct.
						</p>
						<select
							value={statusFilter}
							onChange={(e) => {
								setStatusFilter(e.target.value);
								setSkip(0);
							}}
							className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">All statuses</option>
							<option value="pending">Pending</option>
							<option value="accepted">Accepted</option>
							<option value="picked-up">Picked up</option>
							<option value="delivered">Delivered</option>
							<option value="cancelled">Cancelled</option>
							<option value="failed">Failed</option>
						</select>
					</div>

					{deliveriesLoading ? (
						<div className="space-y-2">
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									key={`del-skel-${i}`}
									className="h-14 animate-pulse rounded-md border border-border bg-muted/30"
								/>
							))}
						</div>
					) : deliveries.length === 0 ? (
						<p className="rounded-md border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
							No deliveries found. Deliveries will appear here when customers
							request Uber Direct delivery at checkout.
						</p>
					) : (
						<>
							<div className="space-y-2">
								{deliveries.map((d) => {
									const statusClass =
										STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground";
									return (
										<div
											key={d.id}
											className="flex items-center justify-between rounded-md border border-border p-3"
										>
											<div className="flex flex-col gap-0.5">
												<div className="flex items-center gap-2">
													<span className="font-medium text-foreground text-sm">
														Order {d.orderId}
													</span>
													{d.courierName && (
														<span className="text-muted-foreground text-xs">
															· {d.courierName}
														</span>
													)}
												</div>
												<span className="text-muted-foreground text-xs">
													{formatCurrency(d.fee)} fee
													{d.tip > 0 ? ` + ${formatCurrency(d.tip)} tip` : ""}
													{d.createdAt ? ` · ${formatDate(d.createdAt)}` : ""}
												</span>
											</div>
											<div className="flex items-center gap-2">
												{d.trackingUrl && (
													<a
														href={d.trackingUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 text-xs hover:underline dark:text-blue-400"
													>
														Track
													</a>
												)}
												<span
													className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${statusClass}`}
												>
													{d.status}
												</span>
											</div>
										</div>
									);
								})}
							</div>

							{total > PAGE_SIZE && (
								<div className="mt-3 flex items-center justify-between">
									<span className="text-muted-foreground text-sm">
										Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of{" "}
										{total}
									</span>
									<span className="space-x-2">
										<button
											type="button"
											onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
											disabled={skip === 0}
											className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
										>
											Previous
										</button>
										<button
											type="button"
											onClick={() => setSkip((s) => s + PAGE_SIZE)}
											disabled={skip + PAGE_SIZE >= total}
											className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
										>
											Next
										</button>
									</span>
								</div>
							)}
						</>
					)}
				</SettingsCard>

				{/* ── Supported webhook events ───────────────────────── */}
				<SettingsCard label="Supported webhook events">
					<div className="flex flex-wrap gap-2">
						{[
							"uber-direct.delivery.created",
							"uber-direct.delivery.picked-up",
							"uber-direct.delivery.delivered",
							"uber-direct.delivery.cancelled",
							"uber-direct.quote.created",
							"uber-direct.webhook.received",
						].map((event) => (
							<span
								key={event}
								className="rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs"
							>
								{event}
							</span>
						))}
					</div>
				</SettingsCard>
			</div>
		</UberDirectAdminTemplate>
	);
}
