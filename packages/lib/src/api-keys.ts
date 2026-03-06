import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "86d_";
const API_KEY_RANDOM_BYTES = 32;

export function generateApiKey(): string {
	const random = randomBytes(API_KEY_RANDOM_BYTES).toString("hex");
	return `${API_KEY_PREFIX}${random}`;
}

export function hashApiKey(key: string): string {
	return createHash("sha256").update(key).digest("hex");
}

export function isValidApiKeyFormat(key: string): boolean {
	return (
		typeof key === "string" &&
		key.startsWith(API_KEY_PREFIX) &&
		key.length === API_KEY_PREFIX.length + API_KEY_RANDOM_BYTES * 2
	);
}
