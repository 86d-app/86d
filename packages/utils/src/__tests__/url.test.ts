import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBaseUrl } from "../url";

describe("getBaseUrl", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.NEXT_PUBLIC_STORE_URL;
		delete process.env.VERCEL_URL;
		delete process.env.PORT;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("returns NEXT_PUBLIC_STORE_URL when set", () => {
		process.env.NEXT_PUBLIC_STORE_URL = "https://mystore.com";
		expect(getBaseUrl()).toBe("https://mystore.com");
	});

	it("returns Vercel URL with https when VERCEL_URL is set", () => {
		process.env.VERCEL_URL = "my-app.vercel.app";
		expect(getBaseUrl()).toBe("https://my-app.vercel.app");
	});

	it("prefers NEXT_PUBLIC_STORE_URL over VERCEL_URL", () => {
		process.env.NEXT_PUBLIC_STORE_URL = "https://mystore.com";
		process.env.VERCEL_URL = "my-app.vercel.app";
		expect(getBaseUrl()).toBe("https://mystore.com");
	});

	it("returns localhost with PORT when no URLs set", () => {
		process.env.PORT = "4000";
		expect(getBaseUrl()).toBe("http://localhost:4000");
	});

	it("defaults to port 3000 when nothing is set", () => {
		expect(getBaseUrl()).toBe("http://localhost:3000");
	});
});
