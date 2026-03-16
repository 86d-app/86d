import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
	StorageDeleteOptions,
	StorageProvider,
	StorageUploadOptions,
	StorageUploadResult,
} from "./index.ts";

export class LocalStorageProvider implements StorageProvider {
	private readonly baseDir: string;
	private readonly baseUrl: string;

	constructor(baseDir: string, baseUrl: string) {
		this.baseDir = resolve(baseDir);
		this.baseUrl = baseUrl.replace(/\/$/, "");
		// Ensure base directory exists
		if (!existsSync(this.baseDir)) {
			mkdirSync(this.baseDir, { recursive: true });
		}
	}

	async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
		const filePath = join(this.baseDir, options.key);
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const buffer =
			options.content instanceof ArrayBuffer
				? Buffer.from(options.content)
				: options.content;
		writeFileSync(filePath, buffer);
		return {
			url: `${this.baseUrl}/${options.key}`,
			key: options.key,
		};
	}

	async delete(options: StorageDeleteOptions): Promise<void> {
		const filePath = join(this.baseDir, options.key);
		if (existsSync(filePath)) {
			unlinkSync(filePath);
		}
	}

	getUrl(key: string): string {
		return `${this.baseUrl}/${key}`;
	}

	async healthCheck(): Promise<boolean> {
		return existsSync(this.baseDir);
	}
}
