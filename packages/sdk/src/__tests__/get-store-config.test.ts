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
		for (const key of [
			"STORE_ID",
			"86D_API_URL",
			"86D_API_KEY",
			"86D_STORE_ID",
			"86D_WORKLOAD_CREDENTIAL",
		] as const) {
			Reflect.deleteProperty(process.env, key);
		}
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

	it("fails closed on a compromised legacy Control Plane config response", async () => {
		const secretCanary = "legacy-provider-secret-must-not-escape";
		globalThis.fetch = vi.fn().mockResolvedValue(
			Response.json({
				theme: "remote",
				name: "Compromised Store",
				favicon: "/remote.ico",
				icon: DEFAULT_CONFIG.icon,
				logo: DEFAULT_CONFIG.logo,
				moduleOptions: {
					"@86d-app/stripe": { secretKey: secretCanary },
				},
			}),
		);

		let failure: unknown;
		try {
			await getStoreConfig({ storeId: VALID_UUID, apiKey: "legacy-key" });
		} catch (error) {
			failure = error;
		}

		expect(failure).toBeInstanceOf(Error);
		expect(String(failure)).toContain("Invalid store config from 86d API");
		expect(String(failure)).not.toContain(secretCanary);
	});

	it("uses managed workload exchange for a newly provisioned Store", async () => {
		const credentialId = "86d_wc_abcdefghijklmnopqrstuvwx";
		const credentialSecret = "s".repeat(43);
		process.env["86D_STORE_ID"] = VALID_UUID;
		process.env["86D_API_URL"] = "https://api.86d.app";
		process.env["86D_WORKLOAD_CREDENTIAL"] =
			`${credentialId}.${credentialSecret}`;
		process.env.STORE_ID = "784d078d-9202-43e7-9624-63a92f479331";
		process.env["86D_API_KEY"] = "legacy-key-must-not-be-used";
		globalThis.fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					access_token: "scoped-config-token",
					token_type: "Bearer",
					expires_in: 300,
					scope: "runtime.config:read",
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					theme: "managed",
					name: "Managed Store",
					favicon: "/managed.ico",
					icon: DEFAULT_CONFIG.icon,
					logo: DEFAULT_CONFIG.logo,
					variables: DEFAULT_CONFIG.variables,
				}),
			);

		const config = await getStoreConfig();

		expect(config.name).toBe("Managed Store");
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
		expect(globalThis.fetch).toHaveBeenNthCalledWith(
			1,
			"https://api.86d.app/api/oauth/token",
			expect.objectContaining({ method: "POST" }),
		);
		const configRequest = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
			.calls[1];
		expect(configRequest?.[0].toString()).toBe(
			`https://api.86d.app/api/v1/stores/${VALID_UUID}`,
		);
		expect(configRequest?.[1]).toEqual(
			expect.objectContaining({ headers: expect.any(Headers) }),
		);
		const requestHeaders = new Headers(
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[1]
				?.headers,
		);
		expect(requestHeaders.get("Authorization")).toBe(
			"Bearer scoped-config-token",
		);
		expect(
			JSON.stringify((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls),
		).not.toContain("legacy-key-must-not-be-used");
	});

	it("fails closed on a compromised managed Control Plane config response", async () => {
		const secretCanary = "managed-provider-secret-must-not-escape";
		process.env["86D_STORE_ID"] = VALID_UUID;
		process.env["86D_API_URL"] = "https://api.86d.app";
		process.env["86D_WORKLOAD_CREDENTIAL"] =
			`86d_wc_compromisedconfigclient1.${"c".repeat(43)}`;
		globalThis.fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					access_token: "scoped-config-token",
					token_type: "Bearer",
					expires_in: 300,
					scope: "runtime.config:read",
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					theme: "remote",
					name: "Compromised Store",
					favicon: "/remote.ico",
					icon: DEFAULT_CONFIG.icon,
					logo: DEFAULT_CONFIG.logo,
					notificationSettings: {
						fromAddress: `${secretCanary}@example.com`,
					},
					webhookSettings: { signingSecret: secretCanary },
				}),
			);

		let failure: unknown;
		try {
			await getStoreConfig();
		} catch (error) {
			failure = error;
		}

		expect(failure).toBeInstanceOf(Error);
		expect(String(failure)).toContain("Invalid store config from 86d API");
		expect(String(failure)).not.toContain(secretCanary);
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it("reuses one managed access token across sequential config reads", async () => {
		process.env["86D_STORE_ID"] = VALID_UUID;
		process.env["86D_API_URL"] = "https://api.86d.app";
		process.env["86D_WORKLOAD_CREDENTIAL"] =
			`86d_wc_sequentialcacheclient001.${"q".repeat(43)}`;
		globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
			const url = input instanceof Request ? input.url : input.toString();
			if (url.endsWith("/api/oauth/token")) {
				return Response.json({
					access_token: "shared-sequential-token",
					token_type: "Bearer",
					expires_in: 300,
					scope: "runtime.config:read",
				});
			}
			return Response.json({
				theme: "managed",
				name: "Managed Store",
				favicon: "/managed.ico",
				icon: DEFAULT_CONFIG.icon,
				logo: DEFAULT_CONFIG.logo,
				variables: DEFAULT_CONFIG.variables,
			});
		});

		await getStoreConfig();
		await getStoreConfig();

		const tokenExchanges = (
			globalThis.fetch as ReturnType<typeof vi.fn>
		).mock.calls.filter(([input]) =>
			input.toString().endsWith("/api/oauth/token"),
		);
		expect(tokenExchanges).toHaveLength(1);
		expect(globalThis.fetch).toHaveBeenCalledTimes(3);
	});

	it("coalesces concurrent managed config token exchanges", async () => {
		process.env["86D_STORE_ID"] = VALID_UUID;
		process.env["86D_API_URL"] = "https://api.86d.app";
		process.env["86D_WORKLOAD_CREDENTIAL"] =
			`86d_wc_concurrentcacheclient001.${"r".repeat(43)}`;
		globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
			const url = input instanceof Request ? input.url : input.toString();
			if (url.endsWith("/api/oauth/token")) {
				await new Promise((resolve) => setTimeout(resolve, 0));
				return Response.json({
					access_token: "shared-concurrent-token",
					token_type: "Bearer",
					expires_in: 300,
					scope: "runtime.config:read",
				});
			}
			return Response.json({
				theme: "managed",
				name: "Managed Store",
				favicon: "/managed.ico",
				icon: DEFAULT_CONFIG.icon,
				logo: DEFAULT_CONFIG.logo,
				variables: DEFAULT_CONFIG.variables,
			});
		});

		await Promise.all([getStoreConfig(), getStoreConfig()]);

		const tokenExchanges = (
			globalThis.fetch as ReturnType<typeof vi.fn>
		).mock.calls.filter(([input]) =>
			input.toString().endsWith("/api/oauth/token"),
		);
		expect(tokenExchanges).toHaveLength(1);
		expect(globalThis.fetch).toHaveBeenCalledTimes(3);
	});

	it("uses the local template without a Control Plane call when no managed API key exists", async () => {
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
		globalThis.fetch = vi.fn();

		const config = await getStoreConfig({
			storeId: VALID_UUID,
			templatePath: configPath,
		});
		expect(config.name).toBe("Local Store");
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});

	it.each([
		[
			"revoked",
			async () => Response.json({ error: "invalid_client" }, { status: 401 }),
		],
		[
			"network failure",
			async () => Promise.reject(new Error("control plane unavailable")),
		],
	])(
		"fails closed on managed %s instead of loading a local template",
		async (_label, exchangeResult) => {
			const configPath = join(TMP_DIR, "managed-fail-closed.json");
			writeFileSync(
				configPath,
				JSON.stringify({
					theme: "forbidden-fallback",
					name: "Must Not Load",
					favicon: "/fallback.ico",
					icon: DEFAULT_CONFIG.icon,
					logo: DEFAULT_CONFIG.logo,
					variables: DEFAULT_CONFIG.variables,
				}),
			);
			process.env["86D_STORE_ID"] = VALID_UUID;
			process.env["86D_API_URL"] = "https://api.86d.app";
			process.env["86D_WORKLOAD_CREDENTIAL"] =
				`86d_wc_abcdefghijklmnopqrstuvwx.${"s".repeat(43)}`;
			globalThis.fetch = vi.fn(exchangeResult);

			await expect(
				getStoreConfig({
					templatePath: configPath,
					fallbackToTemplateOnError: true,
				}),
			).rejects.toThrow();
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		},
	);

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
