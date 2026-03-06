interface RateLimiterOptions {
	limit: number;
	window: number;
}

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

interface RateLimiter {
	check(key: string): RateLimitResult;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
	const hits = new Map<string, { count: number; resetAt: number }>();

	return {
		check(key: string): RateLimitResult {
			const now = Date.now();
			const entry = hits.get(key);

			if (!entry || now >= entry.resetAt) {
				const resetAt = now + options.window;
				hits.set(key, { count: 1, resetAt });
				return { allowed: true, remaining: options.limit - 1, resetAt };
			}

			entry.count++;
			if (entry.count > options.limit) {
				return { allowed: false, remaining: 0, resetAt: entry.resetAt };
			}

			return {
				allowed: true,
				remaining: options.limit - entry.count,
				resetAt: entry.resetAt,
			};
		},
	};
}
