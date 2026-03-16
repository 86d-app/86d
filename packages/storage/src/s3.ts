import { createHash, createHmac } from "node:crypto";
import type {
	StorageDeleteOptions,
	StorageProvider,
	StorageUploadOptions,
	StorageUploadResult,
} from "./index.ts";

interface S3Config {
	endpoint: string;
	bucket: string;
	region: string;
	accessKey: string;
	secretKey: string;
}

/** Minimal S3-compatible client using AWS Signature V4 and fetch. */
export class S3StorageProvider implements StorageProvider {
	private readonly config: S3Config;

	constructor(config: S3Config) {
		this.config = config;
	}

	private getBaseUrl(): string {
		const { endpoint, bucket } = this.config;
		// Path-style for MinIO compatibility
		return `${endpoint.replace(/\/$/, "")}/${bucket}`;
	}

	private sign(
		method: string,
		path: string,
		headers: Record<string, string>,
		payload: Buffer | null,
	): Record<string, string> {
		const { region, accessKey, secretKey } = this.config;
		const now = new Date();
		const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
		const amzDate = `${dateStamp}T${now.toISOString().replace(/[-:]/g, "").slice(9, 15)}Z`;
		const service = "s3";
		const scope = `${dateStamp}/${region}/${service}/aws4_request`;

		const payloadHash = createHash("sha256")
			.update(payload ?? "")
			.digest("hex");
		const allHeaders: Record<string, string> = {
			...headers,
			host: new URL(this.getBaseUrl()).host,
			"x-amz-date": amzDate,
			"x-amz-content-sha256": payloadHash,
		};

		const signedHeaderKeys = Object.keys(allHeaders).sort();
		const signedHeaders = signedHeaderKeys.join(";");
		const canonicalHeaders = signedHeaderKeys
			.map((k) => `${k}:${allHeaders[k]}\n`)
			.join("");
		const canonicalRequest = [
			method,
			path,
			"",
			canonicalHeaders,
			signedHeaders,
			payloadHash,
		].join("\n");
		const stringToSign = [
			"AWS4-HMAC-SHA256",
			amzDate,
			scope,
			createHash("sha256").update(canonicalRequest).digest("hex"),
		].join("\n");

		const kDate = createHmac("sha256", `AWS4${secretKey}`)
			.update(dateStamp)
			.digest();
		const kRegion = createHmac("sha256", kDate).update(region).digest();
		const kService = createHmac("sha256", kRegion).update(service).digest();
		const kSigning = createHmac("sha256", kService)
			.update("aws4_request")
			.digest();
		const signature = createHmac("sha256", kSigning)
			.update(stringToSign)
			.digest("hex");

		return {
			...allHeaders,
			authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
		};
	}

	async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
		const buffer =
			options.content instanceof ArrayBuffer
				? Buffer.from(options.content)
				: options.content;
		const path = `/${this.config.bucket}/${options.key}`;
		const headers = this.sign(
			"PUT",
			path,
			{ "content-type": options.contentType },
			buffer,
		);
		const url = `${this.getBaseUrl()}/${options.key}`;

		const response = await fetch(url, {
			method: "PUT",
			headers,
			body: new Uint8Array(buffer),
		});

		if (!response.ok) {
			throw new Error(
				`S3 upload failed: ${response.status} ${response.statusText}`,
			);
		}

		return { url, key: options.key };
	}

	async delete(options: StorageDeleteOptions): Promise<void> {
		const path = `/${this.config.bucket}/${options.key}`;
		const headers = this.sign("DELETE", path, {}, null);
		const url = `${this.getBaseUrl()}/${options.key}`;

		const response = await fetch(url, { method: "DELETE", headers });
		if (!response.ok && response.status !== 404) {
			throw new Error(
				`S3 delete failed: ${response.status} ${response.statusText}`,
			);
		}
	}

	getUrl(key: string): string {
		return `${this.getBaseUrl()}/${key}`;
	}

	async healthCheck(): Promise<boolean> {
		try {
			const path = `/${this.config.bucket}`;
			const headers = this.sign("HEAD", path, {}, null);
			const response = await fetch(`${this.getBaseUrl()}/`, {
				method: "HEAD",
				headers,
			});
			return response.ok || response.status === 404 || response.status === 403;
		} catch {
			return false;
		}
	}
}
