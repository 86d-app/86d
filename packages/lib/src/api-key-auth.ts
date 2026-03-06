export function extractBearerToken(header: string | null): string | null {
	if (!header) return null;
	const parts = header.split(" ");
	if (parts.length !== 2 || parts[0] !== "Bearer") return null;
	return parts[1] ?? null;
}

interface ApiKeyRecord {
	id: string;
	keyHash: string;
	storeId: string;
	scopes: string[];
	revokedAt: Date | null;
	expiresAt: Date | null;
}

type ValidateResult =
	| {
			authenticated: true;
			apiKeyId: string;
			storeId: string;
			scopes: string[];
	  }
	| { authenticated: false; error: string; status: 401 | 403 };

export function validateApiKey(
	_token: string,
	record: ApiKeyRecord | null,
): ValidateResult {
	if (!record) {
		return { authenticated: false, error: "Invalid API key", status: 401 };
	}

	if (record.revokedAt) {
		return {
			authenticated: false,
			error: "API key has been revoked",
			status: 401,
		};
	}

	if (record.expiresAt && record.expiresAt < new Date()) {
		return {
			authenticated: false,
			error: "API key has expired",
			status: 401,
		};
	}

	return {
		authenticated: true,
		apiKeyId: record.id,
		storeId: record.storeId,
		scopes: record.scopes,
	};
}

export function hasRequiredScope(
	scopes: string[],
	path: string,
	method: string,
): boolean {
	const isAdmin = path.startsWith("/admin");
	const isWrite = !["GET", "HEAD", "OPTIONS"].includes(method);

	const requiredScope = `${isAdmin ? "admin" : "store"}:${isWrite ? "write" : "read"}`;

	return (
		scopes.includes("*") ||
		scopes.includes(requiredScope) ||
		(isWrite && scopes.includes(`${isAdmin ? "admin" : "store"}:*`))
	);
}
