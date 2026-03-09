"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

function useAnnouncementsAdminApi() {
	const client = useModuleClient();
	const api = client.module("announcements").admin;

	return {
		createAnnouncement: api["/admin/announcements/create"],
		updateAnnouncement: api["/admin/announcements/:id/update"],
		getAnnouncement: api["/admin/announcements/:id"],
	};
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "body" in err) {
		const body = (err as { body: { message?: string } }).body;
		return body?.message ?? "An error occurred";
	}
	return "An error occurred";
}

export function AnnouncementForm({ id }: { id?: string }) {
	const api = useAnnouncementsAdminApi();
	const isEdit = Boolean(id);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [type, setType] = useState<"bar" | "banner" | "popup">("bar");
	const [position, setPosition] = useState<"top" | "bottom">("top");
	const [linkUrl, setLinkUrl] = useState("");
	const [linkText, setLinkText] = useState("");
	const [backgroundColor, setBackgroundColor] = useState("");
	const [textColor, setTextColor] = useState("");
	const [isDismissible, setIsDismissible] = useState(true);
	const [targetAudience, setTargetAudience] = useState<
		"all" | "authenticated" | "guest"
	>("all");
	const [error, setError] = useState("");
	const [loaded, setLoaded] = useState(!isEdit);

	const existingQuery = id
		? api.getAnnouncement.useQuery({ params: { id } })
		: null;

	// Populate form when editing
	if (existingQuery?.data?.announcement && !loaded) {
		const a = existingQuery.data.announcement as {
			title: string;
			content: string;
			type: "bar" | "banner" | "popup";
			position: "top" | "bottom";
			linkUrl?: string;
			linkText?: string;
			backgroundColor?: string;
			textColor?: string;
			isDismissible: boolean;
			targetAudience: "all" | "authenticated" | "guest";
		};
		setTitle(a.title);
		setContent(a.content);
		setType(a.type);
		setPosition(a.position);
		setLinkUrl(a.linkUrl ?? "");
		setLinkText(a.linkText ?? "");
		setBackgroundColor(a.backgroundColor ?? "");
		setTextColor(a.textColor ?? "");
		setIsDismissible(a.isDismissible);
		setTargetAudience(a.targetAudience);
		setLoaded(true);
	}

	const createMutation = api.createAnnouncement.useMutation();
	const updateMutation = id ? api.updateAnnouncement.useMutation() : null;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		const body = {
			title,
			content,
			type,
			position,
			linkUrl: linkUrl || undefined,
			linkText: linkText || undefined,
			backgroundColor: backgroundColor || undefined,
			textColor: textColor || undefined,
			isDismissible,
			targetAudience,
		};

		try {
			if (isEdit && id && updateMutation) {
				await updateMutation.mutateAsync({ params: { id }, body });
				window.location.href = `/admin/announcements/${id}`;
			} else {
				const result = await createMutation.mutateAsync({ body });
				const created = result.announcement as { id: string };
				window.location.href = `/admin/announcements/${created.id}`;
			}
		} catch (err) {
			setError(extractError(err));
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<h1>{isEdit ? "Edit Announcement" : "Create Announcement"}</h1>
			{error && <p style={{ color: "red" }}>{error}</p>}

			<label htmlFor="ann-title">
				Title
				<input
					id="ann-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
				/>
			</label>

			<label htmlFor="ann-content">
				Content
				<textarea
					id="ann-content"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					required
				/>
			</label>

			<label htmlFor="ann-type">
				Type
				<select
					id="ann-type"
					value={type}
					onChange={(e) =>
						setType(e.target.value as "bar" | "banner" | "popup")
					}
				>
					<option value="bar">Bar</option>
					<option value="banner">Banner</option>
					<option value="popup">Popup</option>
				</select>
			</label>

			<label htmlFor="ann-position">
				Position
				<select
					id="ann-position"
					value={position}
					onChange={(e) => setPosition(e.target.value as "top" | "bottom")}
				>
					<option value="top">Top</option>
					<option value="bottom">Bottom</option>
				</select>
			</label>

			<label htmlFor="ann-audience">
				Target Audience
				<select
					id="ann-audience"
					value={targetAudience}
					onChange={(e) =>
						setTargetAudience(
							e.target.value as "all" | "authenticated" | "guest",
						)
					}
				>
					<option value="all">All Visitors</option>
					<option value="authenticated">Logged In</option>
					<option value="guest">Guests Only</option>
				</select>
			</label>

			<label htmlFor="ann-link-url">
				Link URL
				<input
					id="ann-link-url"
					type="url"
					value={linkUrl}
					onChange={(e) => setLinkUrl(e.target.value)}
				/>
			</label>

			<label htmlFor="ann-link-text">
				Link Text
				<input
					id="ann-link-text"
					value={linkText}
					onChange={(e) => setLinkText(e.target.value)}
				/>
			</label>

			<label htmlFor="ann-bg-color">
				Background Color
				<input
					id="ann-bg-color"
					value={backgroundColor}
					onChange={(e) => setBackgroundColor(e.target.value)}
					placeholder="#1a1a2e"
				/>
			</label>

			<label htmlFor="ann-text-color">
				Text Color
				<input
					id="ann-text-color"
					value={textColor}
					onChange={(e) => setTextColor(e.target.value)}
					placeholder="#ffffff"
				/>
			</label>

			<label htmlFor="ann-dismissible">
				<input
					id="ann-dismissible"
					type="checkbox"
					checked={isDismissible}
					onChange={(e) => setIsDismissible(e.target.checked)}
				/>
				Dismissible
			</label>

			<button type="submit">{isEdit ? "Update" : "Create"}</button>
			<a href="/admin/announcements">Cancel</a>
		</form>
	);
}
