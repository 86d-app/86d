import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFromApi } from "../fetch-from-api";
import { DEFAULT_CONFIG } from "../types";

// ── Helpers ──

function createValidApiResponse() {
	return {
		theme: "api-theme",
		name: "API Store",
		favicon: "/api-favicon.ico",
		icon: { light: "/api-icon-light.svg", dark: "/api-icon-dark.svg" },
		logo: { light: "/api-logo-light.svg", dark: "/api-logo-dark.svg" },
		modules: ["@86d-app/cart", "@86d-app/products"],
		variables: {
			light: DEFAULT_CONFIG.variables.light,
			dark: DEFAULT_CONFIG.variables.dark,
		},
	};
}

describe("fetchFromApi", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("fetches config from correct URL", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createValidApiResponse()),
		});

		await fetchFromApi("abc-123", "https://api.86d.app");

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.86d.app/v1/stores/abc-123",
			expect.objectContaining({
				headers: expect.objectContaining({
					"Content-Type": "application/json",
				}),
			}),
		);
	});

	it("strips trailing slash from API base URL", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createValidApiResponse()),
		});

		await fetchFromApi("abc-123", "https://api.86d.app/");

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://api.86d.app/v1/stores/abc-123",
			expect.anything(),
		);
	});

	it("includes Authorization header when API key provided", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createValidApiResponse()),
		});

		await fetchFromApi("abc-123", "https://api.86d.app", "my-api-key");

		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer my-api-key",
				}),
			}),
		);
	});

	it("does not include Authorization header without API key", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createValidApiResponse()),
		});

		await fetchFromApi("abc-123", "https://api.86d.app");

		const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		const headers = call[1].headers as Record<string, string>;
		expect(headers.Authorization).toBeUndefined();
	});

	it("returns merged config with defaults", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createValidApiResponse()),
		});

		const config = await fetchFromApi("abc-123", "https://api.86d.app");
		expect(config.theme).toBe("api-theme");
		expect(config.name).toBe("API Store");
		expect(config.variables.light).toBeDefined();
		expect(config.variables.dark).toBeDefined();
	});

	it("throws on non-OK response", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		await expect(fetchFromApi("bad-id", "https://api.86d.app")).rejects.toThrow(
			"86d API request failed: 404 Not Found",
		);
	});

	it("throws on invalid response schema", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ invalid: "data" }),
		});

		await expect(
			fetchFromApi("abc-123", "https://api.86d.app"),
		).rejects.toThrow("Invalid store config from 86d API");
	});
});
