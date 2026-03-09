"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import SocialProofAdminTemplate from "./social-proof-admin.mdx";

interface EventData {
	id: string;
	productId: string;
	productName: string;
	productSlug: string;
	eventType: string;
	region?: string;
	city?: string;
	country?: string;
	quantity?: number;
	createdAt: string;
}

interface TrendingData {
	productId: string;
	productName: string;
	productSlug: string;
	eventCount: number;
	purchaseCount: number;
}

interface SummaryData {
	totalEvents: number;
	totalPurchases: number;
	totalViews: number;
	totalCartAdds: number;
	uniqueProducts: number;
	topProducts: TrendingData[];
}

interface BadgeData {
	id: string;
	name: string;
	description?: string;
	icon: string;
	url?: string;
	position: string;
	priority: number;
	isActive: boolean;
	createdAt: string;
}

const PAGE_SIZE = 30;

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(iso));
}

function extractError(error: Error | null, fallback: string): string {
	if (!error) return fallback;
	// biome-ignore lint/suspicious/noExplicitAny: accessing HTTP error body property
	const body = (error as any)?.body;
	if (typeof body?.error === "string") return body.error;
	if (typeof body?.error?.message === "string") return body.error.message;
	return fallback;
}

function useSocialProofAdminApi() {
	const client = useModuleClient();
	return {
		events: client.module("social-proof").admin["/admin/social-proof/events"],
		summary: client.module("social-proof").admin["/admin/social-proof/summary"],
		badges: client.module("social-proof").admin["/admin/social-proof/badges"],
		createBadge:
			client.module("social-proof").admin["/admin/social-proof/badges/create"],
		deleteBadge:
			client.module("social-proof").admin[
				"/admin/social-proof/badges/:id/delete"
			],
		cleanup:
			client.module("social-proof").admin["/admin/social-proof/events/cleanup"],
	};
}

export function SocialProofAdmin() {
	const api = useSocialProofAdminApi();
	const [eventSkip, setEventSkip] = useState(0);
	const [badgeSkip, setBadgeSkip] = useState(0);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const [error, setError] = useState("");

	const { data: summaryData, isLoading: summaryLoading } = api.summary.useQuery(
		{
			period: "24h",
		},
	) as {
		data: { summary: SummaryData } | undefined;
		isLoading: boolean;
	};

	const { data: eventsData, isLoading: eventsLoading } = api.events.useQuery({
		take: String(PAGE_SIZE),
		skip: String(eventSkip),
	}) as {
		data: { events: EventData[]; total: number } | undefined;
		isLoading: boolean;
	};

	const { data: badgesData, isLoading: badgesLoading } = api.badges.useQuery({
		take: String(PAGE_SIZE),
		skip: String(badgeSkip),
	}) as {
		data: { badges: BadgeData[]; total: number } | undefined;
		isLoading: boolean;
	};

	const summary = summaryData?.summary;
	const events = eventsData?.events ?? [];
	const eventTotal = eventsData?.total ?? 0;
	const badges = badgesData?.badges ?? [];
	const badgeTotal = badgesData?.total ?? 0;

	const deleteMutation = api.deleteBadge.useMutation({
		onSettled: () => {
			setDeleteConfirm(null);
			void api.badges.invalidate();
		},
		onError: (err: Error) => {
			setError(extractError(err, "Failed to delete badge."));
		},
	});

	const handleDeleteBadge = (id: string) => {
		setError("");
		deleteMutation.mutate({ params: { id } });
	};

	const loading = summaryLoading || eventsLoading || badgesLoading;

	const eventTypeLabel = (type: string) => {
		switch (type) {
			case "purchase":
				return "Purchase";
			case "view":
				return "View";
			case "cart_add":
				return "Cart Add";
			case "wishlist_add":
				return "Wishlist";
			default:
				return type;
		}
	};

	const eventsContent = loading ? (
		<div className="py-16 text-center">
			<div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
			<p className="mt-4 text-muted-foreground text-sm">Loading...</p>
		</div>
	) : events.length === 0 ? (
		<div className="px-5 py-8 text-center text-muted-foreground text-sm">
			No activity events recorded yet.
		</div>
	) : (
		<>
			<div className="hidden md:block">
				<table className="w-full text-left text-sm">
					<thead className="border-border border-b bg-muted/50">
						<tr>
							<th className="px-5 py-2.5 font-medium text-muted-foreground">
								Product
							</th>
							<th className="px-5 py-2.5 font-medium text-muted-foreground">
								Event
							</th>
							<th className="px-5 py-2.5 font-medium text-muted-foreground">
								Location
							</th>
							<th className="px-5 py-2.5 font-medium text-muted-foreground">
								Time
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{events.map((event) => (
							<tr key={event.id}>
								<td className="px-5 py-3 text-foreground">
									{event.productName}
								</td>
								<td className="px-5 py-3">
									<span
										className={`rounded-full px-2 py-0.5 text-xs ${
											event.eventType === "purchase"
												? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
												: event.eventType === "cart_add"
													? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
													: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
										}`}
									>
										{eventTypeLabel(event.eventType)}
									</span>
								</td>
								<td className="px-5 py-3 text-muted-foreground">
									{[event.city, event.region, event.country]
										.filter(Boolean)
										.join(", ") || "—"}
								</td>
								<td className="px-5 py-3 text-muted-foreground">
									{formatDate(event.createdAt)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="divide-y divide-border md:hidden">
				{events.map((event) => (
					<div key={event.id} className="px-5 py-3">
						<div className="flex items-start justify-between">
							<div>
								<p className="font-medium text-foreground text-sm">
									{event.productName}
								</p>
								<p className="mt-0.5 text-muted-foreground text-xs">
									{eventTypeLabel(event.eventType)}
									{event.city ? ` · ${event.city}` : ""}
								</p>
								<p className="mt-0.5 text-muted-foreground text-xs">
									{formatDate(event.createdAt)}
								</p>
							</div>
						</div>
					</div>
				))}
			</div>

			{eventTotal > PAGE_SIZE && (
				<div className="flex items-center justify-between border-border border-t px-5 py-3">
					<span className="text-muted-foreground text-sm">
						Showing {eventSkip + 1}–
						{Math.min(eventSkip + PAGE_SIZE, eventTotal)} of {eventTotal}
					</span>
					<span className="space-x-2">
						<button
							type="button"
							onClick={() => setEventSkip((s) => Math.max(0, s - PAGE_SIZE))}
							disabled={eventSkip === 0}
							className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={() => setEventSkip((s) => s + PAGE_SIZE)}
							disabled={eventSkip + PAGE_SIZE >= eventTotal}
							className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
						>
							Next
						</button>
					</span>
				</div>
			)}
		</>
	);

	const badgesContent = loading ? (
		<div className="py-8 text-center">
			<div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
		</div>
	) : badges.length === 0 ? (
		<div className="px-5 py-8 text-center text-muted-foreground text-sm">
			No trust badges created yet.
		</div>
	) : (
		<>
			<div className="divide-y divide-border">
				{badges.map((badge) => (
					<div
						key={badge.id}
						className="flex items-center justify-between px-5 py-3"
					>
						<div className="flex items-center gap-3">
							<span className="text-xl">{badge.icon}</span>
							<div>
								<p className="font-medium text-foreground text-sm">
									{badge.name}
								</p>
								<p className="text-muted-foreground text-xs">
									{badge.position} · Priority {badge.priority}
									{!badge.isActive && " · Inactive"}
								</p>
							</div>
						</div>
						{deleteConfirm === badge.id ? (
							<span className="space-x-2">
								<button
									type="button"
									onClick={() => handleDeleteBadge(badge.id)}
									className="font-medium text-destructive text-xs hover:opacity-80"
								>
									Confirm
								</button>
								<button
									type="button"
									onClick={() => setDeleteConfirm(null)}
									className="text-muted-foreground text-xs hover:text-foreground"
								>
									Cancel
								</button>
							</span>
						) : (
							<button
								type="button"
								onClick={() => setDeleteConfirm(badge.id)}
								className="text-muted-foreground text-xs hover:text-destructive"
							>
								Delete
							</button>
						)}
					</div>
				))}
			</div>

			{badgeTotal > PAGE_SIZE && (
				<div className="flex items-center justify-between border-border border-t px-5 py-3">
					<span className="text-muted-foreground text-sm">
						Showing {badgeSkip + 1}–
						{Math.min(badgeSkip + PAGE_SIZE, badgeTotal)} of {badgeTotal}
					</span>
					<span className="space-x-2">
						<button
							type="button"
							onClick={() => setBadgeSkip((s) => Math.max(0, s - PAGE_SIZE))}
							disabled={badgeSkip === 0}
							className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={() => setBadgeSkip((s) => s + PAGE_SIZE)}
							disabled={badgeSkip + PAGE_SIZE >= badgeTotal}
							className="rounded border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
						>
							Next
						</button>
					</span>
				</div>
			)}
		</>
	);

	return (
		<SocialProofAdminTemplate
			totalEvents={summary?.totalEvents ?? 0}
			totalPurchases={summary?.totalPurchases ?? 0}
			totalViews={summary?.totalViews ?? 0}
			uniqueProducts={summary?.uniqueProducts ?? 0}
			topProducts={summary?.topProducts ?? []}
			error={error}
			eventsContent={eventsContent}
			badgesContent={badgesContent}
		/>
	);
}
