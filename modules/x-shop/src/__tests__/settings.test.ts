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

	it("reports configured when all credentials present", () => {
		const result = resolveSettings({
			apiKey: "abcdefghijklmnop",
			apiSecret: "secret123",
			merchantId: "merch-001",
		});
		expect(result.configured).toBe(true);
		expect(result.merchantId).toBe("merch-001");
		expect(result.apiKey).toBe("abcdefgh...");
	});

	it("masks api key to first 8 characters", () => {
		const result = resolveSettings({
			apiKey: "verylongapikey12345",
			apiSecret: "secret",
			merchantId: "m1",
		});
		expect(result.apiKey).toBe("verylong...");
	});

	it("requires all three credentials for configured status", () => {
		expect(resolveSettings({ apiKey: "k", apiSecret: "s" }).configured).toBe(
			false,
		);
		expect(resolveSettings({ apiKey: "k", merchantId: "m" }).configured).toBe(
			false,
		);
		expect(
			resolveSettings({ apiSecret: "s", merchantId: "m" }).configured,
		).toBe(false);
		expect(
			resolveSettings({ apiKey: "k", apiSecret: "s", merchantId: "m" })
				.configured,
		).toBe(true);
	});
});
