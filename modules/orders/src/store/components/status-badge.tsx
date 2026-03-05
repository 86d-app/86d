"use client";

import StatusBadgeTemplate from "./status-badge.mdx";

export function StatusBadge({
	value,
	styles,
}: {
	value: string;
	styles: Record<string, string>;
}) {
	const colorClass =
		styles[value] ??
		"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
	const label = value.replace(/_/g, " ");

	return <StatusBadgeTemplate colorClass={colorClass} label={label} />;
}
