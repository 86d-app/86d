import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { getStoreConfig } from "../get-store-config";
import { DEFAULT_CONFIG } from "../types";

const TMP_DIR = join(import.meta.dirname, "__tmp_config_test__");
const VALID_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

beforeAll(() => {
	mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
	if (existsSync(TMP_DIR)) {
		rmSync(TMP_DIR, { recursive: true });
	}
});

describe("getStoreConfig", () => {
	const originalFetch = globalThis.fetch;
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.STORE_ID;
		delete process.env["86D_API_URL"];
		delete process.env["86D_API_KEY"];
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		process.env = { ...originalEnv };
	});

	it("loads from template when no storeId", async () => {
		const configPath = join(TMP_DIR, "template-config.json");
		writeFileSync(
			configPath,
			JSON.stringify({
				theme: "template",
				name: "Template Store",
				favicon: "/favicon.ico",
				icon: DEFAULT_CONFIG.icon,
				logo: DEFAULT_CONFIG.logo,
				variables: DEFAULT_CONFIG.variables,
			}),
		);

		const config = await getStoreConfig({ templatePath: configPath });
		expect(config.theme).toBe("template");
		expect(config.name).toBe("Template Store");
	});

	it("throws when no storeId and no templatePath", async () => {
		await expect(getStoreConfig()).rejects.toThrow(
			"Store config requires either a valid STORE_ID",
		);
	});

	it("throws when storeId is not a valid UUID", async () => {
		await expect(getStoreConfig({ storeId: "not-a-uuid" })).rejects.toThrow(
			"Store config requires either a valid STORE_ID",
		);
	});

	it("fetches from API when valid UUID storeId and apiKey provided", async () => {
		const apiResponse = {
			theme: "remote",
			name: "Remote Store",
			favicon: "/remote.ico",
			icon: DEFAULT_CONFIG.icon,
			logo: DEFAULT_CONFIG.logo,
			variables: DEFAULT_CONFIG.variables,
		};
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(apiResponse),
		});

		const config = await getStoreConfig({
			storeId: VALID_UUID,
			apiKey: "test-key",
		});
		expect(config.name).toBe("Remote Store");
	});

	it("uses env STORE_ID and 86D_API_KEY when options not provided", async () => {
		process.env.STORE_ID = VALID_UUID;
		process.env["86D_API_KEY"] = "env-key";
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					theme: "env-store",
					name: "Env Store",
					favicon: "/env.ico",
					icon: DEFAULT_CONFIG.icon,
					logo: DEFAULT_CONFIG.logo,
					variables: DEFAULT_CONFIG.variables,
				}),
		});

		const config = await getStoreConfig();
		expect(config.name).toBe("Env Store");
	});

	it("uses template when valid UUID storeId but no apiKey", async () => {
		const configPath = join(TMP_DIR, "no-key-config.json");
		writeFileSync(
			configPath,
			JSON.stringify({
				theme: "local",
				name: "Local Store",
				favicon: "/local.ico",
				icon: DEFAULT_CONFIG.icon,
				logo: DEFAULT_CONFIG.logo,
				variables: DEFAULT_CONFIG.variables,
			}),
		);

		const config = await getStoreConfig({
			storeId: VALID_UUID,
			templatePath: configPath,
		});
		expect(config.name).toBe("Local Store");
	});

	it("falls back to template on API error when configured", async () => {
		const configPath = join(TMP_DIR, "fallback-config.json");
		writeFileSync(
			configPath,
			JSON.stringify({
				theme: "fallback",
				name: "Fallback Store",
				favicon: "/fallback.ico",
				icon: DEFAULT_CONFIG.icon,
				logo: DEFAULT_CONFIG.logo,
				variables: DEFAULT_CONFIG.variables,
			}),
		);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		const config = await getStoreConfig({
			storeId: VALID_UUID,
			apiKey: "test-key",
			templatePath: configPath,
			fallbackToTemplateOnError: true,
		});
		expect(config.name).toBe("Fallback Store");
	});

	it("throws on API error without fallback", async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		await expect(
			getStoreConfig({ storeId: VALID_UUID, apiKey: "test-key" }),
		).rejects.toThrow("Network error");
	});
});
