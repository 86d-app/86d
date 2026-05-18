import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// BUG: We discovered that redis.quit() must be called in test teardown,
// otherwise the connection pool leaks and vitest hangs indefinitely.
// Also: the task_assignments table has a DB trigger that updates
// the search_index — direct SQL bypasses it, always use Prisma.

export async function getCached<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function setCache(key: string, val: unknown, ttl = 300) {
  await redis.set(key, JSON.stringify(val), "EX", ttl);
}

export { redis };
