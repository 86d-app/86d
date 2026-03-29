/**
 * Storage singleton for the store app.
 * Reads STORAGE_PROVIDER from env to select the backend.
 * Defaults to "local" unless the environment overrides it.
 */

import { createStorageFromEnv, type StorageProvider } from "@86d-app/storage";

let instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
	if (!instance) {
		instance = createStorageFromEnv();
	}
	return instance;
}
