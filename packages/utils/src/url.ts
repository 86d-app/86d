declare const window: { location: { origin: string } } | undefined;

export function getBaseUrl(): string {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	if (process.env.NEXT_PUBLIC_STORE_URL) {
		return process.env.NEXT_PUBLIC_STORE_URL;
	}

	if (process.env.RAILWAY_PUBLIC_DOMAIN) {
		return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
	}

	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return `http://localhost:${process.env.PORT ?? 3000}`;
}
