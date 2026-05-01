"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

function useAnnouncementsAdminApi() {
	const client = useModuleClient();
	const api = client.module("announcements").admin;

	return {
		getAnnouncement: api["/admin/announcements/:id"],
		deleteAnnouncement: api["/admin/announcements/:id/delete"],
		updateAnnouncement: api["/admin/announcements/:id/update"],
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

export function AnnouncementDetail({ id }: { id: string }) {
	const api = useAnnouncementsAdminApi();
	const [error, setError] = useState("");

	const announcementQuery = api.getAnnouncement.useQuery({ params: { id } });
	const toggleMutation = api.updateAnnouncement.useMutation();
	const deleteMutation = api.deleteAnnouncement.useMutation();

	const announcement = announcementQuery.data?.announcement as
		| {
				id: string;
				title: string;
				content: string;
				type: string;
				position: string;
				isActive: boolean;
				isDismissible: boolean;
				priority: number;
				impressions: number;
				clicks: number;
				dismissals: number;
				linkUrl?: string;
				linkText?: string;
				backgroundColor?: string;
				textColor?: string;
				iconName?: string;
				startsAt?: string;
				endsAt?: string;
				targetAudience: string;
				createdAt: string;
				updatedAt: string;
		  }
		| undefined;

	async function handleToggle() {
		if (!announcement) return;
		try {
			await toggleMutation.mutateAsync({
				params: { id },
				body: { isActive: !announcement.isActive },
			});
			void announcementQuery.refetch();
		} catch (err) {
			setError(extractError(err));
		}
	}

	async function handleDelete() {
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.href = "/admin/announcements";
		} catch (err) {
			setError(extractError(err));
		}
	}

	if (announcementQuery.isLoading)
		return (
			<div>
				<Skeleton className="mb-4 h-7 w-1/2" />
				<div className="space-y-3">
					{Array.from({ length: 8 }, (_, i) => (
						<div key={`sk-${i}`} className="flex gap-4">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-40" />
						</div>
					))}
				</div>
			</div>
		);
	if (!announcement) return <p>Announcement not found</p>;

	return (
		<div>
			<h1>{announcement.title}</h1>
			{error && <p style={{ color: "red" }}>{error}</p>}

			<dl>
				<dt>Content</dt>
				<dd>{announcement.content}</dd>
				<dt>Type</dt>
				<dd>{announcement.type}</dd>
				<dt>Position</dt>
				<dd>{announcement.position}</dd>
				<dt>Audience</dt>
				<dd>{announcement.targetAudience}</dd>
				<dt>Status</dt>
				<dd>{announcement.isActive ? "Active" : "Inactive"}</dd>
				<dt>Dismissible</dt>
				<dd>{announcement.isDismissible ? "Yes" : "No"}</dd>
				<dt>Priority</dt>
				<dd>{announcement.priority}</dd>
				{announcement.linkUrl && (
					<>
						<dt>Link</dt>
						<dd>
							{announcement.linkText ?? announcement.linkUrl} →{" "}
							{announcement.linkUrl}
						</dd>
					</>
				)}
				{announcement.backgroundColor && (
					<>
						<dt>Background</dt>
						<dd>{announcement.backgroundColor}</dd>
					</>
				)}
				{announcement.textColor && (
					<>
						<dt>Text Color</dt>
						<dd>{announcement.textColor}</dd>
					</>
				)}
				{announcement.startsAt && (
					<>
						<dt>Starts</dt>
						<dd>{new Date(announcement.startsAt).toLocaleString()}</dd>
					</>
				)}
				{announcement.endsAt && (
					<>
						<dt>Ends</dt>
						<dd>{new Date(announcement.endsAt).toLocaleString()}</dd>
					</>
				)}
				<dt>Impressions</dt>
				<dd>{announcement.impressions}</dd>
				<dt>Clicks</dt>
				<dd>{announcement.clicks}</dd>
				<dt>Dismissals</dt>
				<dd>{announcement.dismissals}</dd>
			</dl>

			<div>
				<button type="button" onClick={handleToggle}>
					{announcement.isActive ? "Deactivate" : "Activate"}
				</button>
				<a href={`/admin/announcements/${id}/edit`}>Edit</a>
				<button type="button" onClick={handleDelete}>
					Delete
				</button>
			</div>
		</div>
	);
}
