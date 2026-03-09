"use client";

import { useCallback, useEffect, useState } from "react";
import { useAnnouncementsApi } from "./_hooks";

interface AnnouncementData {
	id: string;
	title: string;
	content: string;
	type: string;
	position: string;
	linkUrl?: string;
	linkText?: string;
	backgroundColor?: string;
	textColor?: string;
	iconName?: string;
	isDismissible: boolean;
}

export function AnnouncementBar({
	audience,
}: {
	audience?: "all" | "authenticated" | "guest";
}) {
	const api = useAnnouncementsApi();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());

	const { data, isLoading } = api.getActive.useQuery({
		query: { audience },
	}) as {
		data: { announcements: AnnouncementData[] } | undefined;
		isLoading: boolean;
	};

	const impressionMutation = api.recordImpression.useMutation();
	const clickMutation = api.recordClick.useMutation();
	const dismissMutation = api.recordDismissal.useMutation();

	const announcements = data?.announcements ?? [];

	// Filter to bar-type, non-dismissed announcements
	const visible = announcements.filter(
		(a) => a.type === "bar" && !dismissed.has(a.id),
	);

	// Record impressions for visible announcements
	useEffect(() => {
		for (const a of visible) {
			impressionMutation.mutate({ params: { id: a.id } });
		}
	}, [data, visible, impressionMutation]);

	const handleClick = useCallback(
		(id: string) => {
			clickMutation.mutate({ params: { id } });
		},
		[clickMutation],
	);

	const handleDismiss = useCallback(
		(id: string) => {
			setDismissed((prev) => new Set([...prev, id]));
			dismissMutation.mutate({ params: { id } });
		},
		[dismissMutation],
	);

	if (isLoading || visible.length === 0) return null;

	return (
		<div>
			{visible.map((a) => (
				<output
					key={a.id}
					style={{
						backgroundColor: a.backgroundColor ?? "#1a1a2e",
						color: a.textColor ?? "#ffffff",
					}}
				>
					<span>{a.content}</span>
					{a.linkUrl && (
						<a
							href={a.linkUrl}
							onClick={() => handleClick(a.id)}
							style={{ color: a.textColor ?? "#ffffff" }}
						>
							{a.linkText ?? "Learn more"}
						</a>
					)}
					{a.isDismissible && (
						<button
							type="button"
							onClick={() => handleDismiss(a.id)}
							aria-label="Dismiss announcement"
						>
							×
						</button>
					)}
				</output>
			))}
		</div>
	);
}
