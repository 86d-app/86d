"use client";

import HeartIconTemplate from "./heart-icon.mdx";

export function HeartIcon({
	filled,
	large,
}: {
	filled: boolean;
	large?: boolean | undefined;
}) {
	const sizeClass = large
		? `h-12 w-12 inline-block ${filled ? "text-red-500" : "text-gray-300 dark:text-gray-600"}`
		: `h-4 w-4 inline-block ${filled ? "text-red-500" : "text-current"}`;
	return <HeartIconTemplate filled={filled} sizeClass={sizeClass} />;
}
