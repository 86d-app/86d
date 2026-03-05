export function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

export function extractError(error: Error | null, fallback: string): string {
	if (!error) return fallback;
	// biome-ignore lint/suspicious/noExplicitAny: accessing HTTP error body property
	const body = (error as any)?.body;
	if (typeof body?.error === "string") return body.error;
	if (typeof body?.error?.message === "string") return body.error.message;
	return fallback;
}
