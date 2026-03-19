import { fetchFromApi } from "./fetch-from-api";
import { loadFromTemplate } from "./load-from-template";
import type { Config } from "./types";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
	return UUID_REGEX.test(value);
}

export interface GetStoreConfigOptions {
	/** Store ID (default: process.env.STORE_ID) */
	storeId?: string;
	/** Base URL for 86d API (default: process.env.86D_API_URL or https://api.86d.app) */
	apiBaseUrl?: string;
	/** API key for authenticated requests (default: process.env.86D_API_KEY) */
	apiKey?: string;
	/** Path to template config.json when no STORE_ID (required when STORE_ID absent) */
	templatePath?: string;
	/** Fall back to template on API error */
	fallbackToTemplateOnError?: boolean;
}

const DEFAULT_API_BASE_URL = "https://api.86d.app";

/**
 * Resolve store configuration from the 86d API (when STORE_ID is set) or from
 * the local template config.json (otherwise).
 */
export async function getStoreConfig(
	options?: GetStoreConfigOptions,
): Promise<Config> {
	const storeId =
		options?.storeId ?? (process.env.STORE_ID as string | undefined);
	const apiBaseUrl =
		options?.apiBaseUrl ??
		(process.env["86D_API_URL"] as string | undefined) ??
		DEFAULT_API_BASE_URL;
	const apiKey =
		options?.apiKey ?? (process.env["86D_API_KEY"] as string | undefined);
	const templatePath = options?.templatePath;
	const fallbackToTemplate = options?.fallbackToTemplateOnError ?? false;

	if (storeId && isValidUUID(storeId) && apiKey) {
		try {
			return await fetchFromApi(storeId, apiBaseUrl, apiKey);
		} catch (err) {
			if (fallbackToTemplate && templatePath) {
				return loadFromTemplate(templatePath);
			}
			throw err;
		}
	}

	if (templatePath) {
		return loadFromTemplate(templatePath);
	}

	throw new Error(
		"Store config requires either a valid STORE_ID (UUID) with 86d API, or templatePath to load from template/config.json",
	);
}
