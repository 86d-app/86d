export function extractError(error: Error | null, fallback: string): string {
	if (!error) return fallback;
	// biome-ignore lint/suspicious/noExplicitAny: accessing HTTP error body property
	const body = (error as any)?.body;
	if (typeof body?.error === "string") return body.error;
	if (typeof body?.error?.message === "string") return body.error.message;
	return fallback;
}

export function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}
