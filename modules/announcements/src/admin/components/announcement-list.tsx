"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

function useAnnouncementsAdminApi() {
	const client = useModuleClient();
	const api = client.module("announcements").admin;

	return {
		listAnnouncements: api["/admin/announcements"],
		getStats: api["/admin/announcements/stats"],
		deleteAnnouncement: api["/admin/announcements/:id/delete"],
		reorder: api["/admin/announcements/reorder"],
	};
}

function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded bg-muted ${className}`}
			aria-hidden="true"
		/>
	);
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "body" in err) {
		const body = (err as { body: { message?: string } }).body;
		return body?.message ?? "An error occurred";
	}
	return "An error occurred";
}

interface AnnouncementItem {
	id: string;
	title: string;
	content: string;
	type: string;
	position: string;
	isActive: boolean;
	priority: number;
	impressions: number;
	clicks: number;
	dismissals: number;
	startsAt?: string;
	endsAt?: string;
	targetAudience: string;
}

export function AnnouncementList() {
	const api = useAnnouncementsAdminApi();
	const [typeFilter, setTypeFilter] = useState("");
	const [error, setError] = useState("");

	const listQuery = api.listAnnouncements.useQuery({
		query: { type: typeFilter || undefined },
	});

	const statsQuery = api.getStats.useQuery({});
	const deleteMutation = api.deleteAnnouncement.useMutation();

	const announcements = (listQuery.data?.announcements ??
		[]) as AnnouncementItem[];
	const stats = statsQuery.data?.stats;

	async function handleDelete(id: string) {
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			listQuery.refetch();
			statsQuery.refetch();
		} catch (err) {
			setError(extractError(err));
		}
	}

	return (
		<div>
			<h1>Announcements</h1>
			{error && <p style={{ color: "red" }}>{error}</p>}

			{stats && (
				<div>
					<span>Active: {stats.activeAnnouncements}</span>
					<span>Scheduled: {stats.scheduledAnnouncements}</span>
					<span>Impressions: {stats.totalImpressions}</span>
					<span>
						Click rate: {((stats.clickRate as number) * 100).toFixed(1)}%
					</span>
				</div>
			)}

			<div>
				<label htmlFor="type-filter">
					Type:
					<select
						id="type-filter"
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
					>
						<option value="">All</option>
						<option value="bar">Bar</option>
						<option value="banner">Banner</option>
						<option value="popup">Popup</option>
					</select>
				</label>
			</div>

			<table>
				<thead>
					<tr>
						<th>Title</th>
						<th>Type</th>
						<th>Position</th>
						<th>Audience</th>
						<th>Status</th>
						<th>Priority</th>
						<th>Impressions</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{listQuery.isLoading
						? Array.from({ length: 5 }, (_, i) => (
								<tr key={`sk-${i}`}>
									{Array.from({ length: 8 }, (_, j) => (
										<td key={`sk-cell-${j}`} className="px-4 py-3">
											<Skeleton className="h-4" />
										</td>
									))}
								</tr>
							))
						: announcements.map((a) => (
								<tr key={a.id}>
									<td>
										<a href={`/admin/announcements/${a.id}`}>{a.title}</a>
									</td>
									<td>{a.type}</td>
									<td>{a.position}</td>
									<td>{a.targetAudience}</td>
									<td>{a.isActive ? "Active" : "Inactive"}</td>
									<td>{a.priority}</td>
									<td>{a.impressions}</td>
									<td>
										<a href={`/admin/announcements/${a.id}/edit`}>Edit</a>
										<button type="button" onClick={() => handleDelete(a.id)}>
											Delete
										</button>
									</td>
								</tr>
							))}
				</tbody>
			</table>

			<a href="/admin/announcements/new">Create Announcement</a>
		</div>
	);
}
