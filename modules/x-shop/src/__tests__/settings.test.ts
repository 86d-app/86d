import { describe, expect, it } from "vitest";
import { resolveSettings } from "../admin/endpoints/get-settings";

describe("x-shop settings", () => {
	it("reports not configured when no credentials", () => {
		const result = resolveSettings({});
		expect(result.configured).toBe(false);
		expect(result.merchantId).toBeNull();
		expect(result.apiKey).toBeNull();
	});

	it("reports not configured when partial credentials", () => {
		const result = resolveSettings({ apiKey: "key12345678" });
		expect(result.configured).toBe(false);
		expect(result.merchantId).toBeNull();
		expect(result.apiKey).toBe("key12345...");
	});

	it("reports configured when apiKey, apiSecret, and accessToken are present", () => {
		const result = resolveSettings({
			apiKey: "abcdefghijklmnop",
			apiSecret: "secret123",
			accessToken: "at-token-abc",
			merchantId: "merch-001",
		});
		expect(result.configured).toBe(true);
		expect(result.merchantId).toBe("merch-001");
		expect(result.apiKey).toBe("abcdefgh...");
	});

	it("reports configured even without merchantId", () => {
		const result = resolveSettings({
			apiKey: "abcdefghijklmnop",
			apiSecret: "secret123",
			accessToken: "at-token-abc",
		});
		expect(result.configured).toBe(true);
		expect(result.merchantId).toBeNull();
	});

	it("masks api key to first 8 characters", () => {
		const result = resolveSettings({
			apiKey: "verylongapikey12345",
			apiSecret: "secret",
			accessToken: "at-token",
		});
		expect(result.apiKey).toBe("verylong...");
	});

	it("requires apiKey, apiSecret, and accessToken for configured status", () => {
		expect(resolveSettings({ apiKey: "k", apiSecret: "s" }).configured).toBe(
			false,
		);
		expect(resolveSettings({ apiKey: "k", accessToken: "a" }).configured).toBe(
			false,
		);
		expect(
			resolveSettings({ apiSecret: "s", accessToken: "a" }).configured,
		).toBe(false);
		expect(
			resolveSettings({ apiKey: "k", apiSecret: "s", accessToken: "a" })
				.configured,
		).toBe(true);
	});
});
