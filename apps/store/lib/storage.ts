/**
 * Storage singleton for the store app.
 * Reads STORAGE_PROVIDER from env to select the backend.
 * Defaults to "local" for Docker/dev, "vercel" when BLOB_READ_WRITE_TOKEN is set.
 */

import { createStorageFromEnv, type StorageProvider } from "@86d-app/storage";

let instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
	if (!instance) {
		instance = createStorageFromEnv();
	}
	return instance;
}
