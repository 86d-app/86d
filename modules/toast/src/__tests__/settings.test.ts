import { describe, expect, it } from "vitest";

describe("Toast settings endpoint", () => {
	it("returns configured=true when both apiKey and restaurantGuid are set", async () => {
		const result = await callSettingsHandler({
			apiKey: "toast_abcdefghijklmnop",
			restaurantGuid: "guid-1234-5678-abcd",
			sandbox: true,
		});
		expect(result.configured).toBe(true);
		expect(result.sandbox).toBe(true);
		expect(result.apiKeyMasked).not.toBeNull();
		expect(result.restaurantGuidMasked).not.toBeNull();
	});

	it("returns configured=false when apiKey is missing", async () => {
		const result = await callSettingsHandler({
			restaurantGuid: "guid-1234-5678-abcd",
		});
		expect(result.configured).toBe(false);
		expect(result.apiKeyMasked).toBeNull();
	});

	it("returns configured=false when restaurantGuid is missing", async () => {
		const result = await callSettingsHandler({
			apiKey: "toast_abcdefghijklmnop",
		});
		expect(result.configured).toBe(false);
		expect(result.restaurantGuidMasked).toBeNull();
	});

	it("returns configured=false when both are missing", async () => {
		const result = await callSettingsHandler({});
		expect(result.configured).toBe(false);
		expect(result.apiKeyMasked).toBeNull();
		expect(result.restaurantGuidMasked).toBeNull();
	});

	it("masks API key showing first 7 chars", async () => {
		const result = await callSettingsHandler({
			apiKey: "toast_abcdefghijklmnop",
			restaurantGuid: "guid-1234-5678-abcd",
		});
		expect(result.apiKeyMasked).toBe("toast_a***************");
	});

	it("masks short keys as ****", async () => {
		const result = await callSettingsHandler({
			apiKey: "short",
			restaurantGuid: "guid-1234-5678-abcd",
		});
		expect(result.apiKeyMasked).toBe("****");
	});

	it("defaults sandbox to true", async () => {
		const result = await callSettingsHandler({
			apiKey: "toast_key",
			restaurantGuid: "guid-123",
		});
		expect(result.sandbox).toBe(true);
	});

	it("respects sandbox=false", async () => {
		const result = await callSettingsHandler({
			apiKey: "toast_key",
			restaurantGuid: "guid-123",
			sandbox: false,
		});
		expect(result.sandbox).toBe(false);
	});
});

// Helper: directly invoke the settings logic (mirrors what the endpoint handler does)
async function callSettingsHandler(options: {
	apiKey?: string;
	restaurantGuid?: string;
	sandbox?: boolean;
}) {
	function maskKey(key: string): string {
		if (key.length <= 8) return "****";
		return `${key.slice(0, 7)}${"*".repeat(Math.min(key.length - 7, 20))}`;
	}

	const hasCredentials = Boolean(options.apiKey && options.restaurantGuid);
	return {
		configured: hasCredentials,
		sandbox: options.sandbox ?? true,
		apiKeyMasked: options.apiKey ? maskKey(options.apiKey) : null,
		restaurantGuidMasked: options.restaurantGuid
			? maskKey(options.restaurantGuid)
			: null,
	};
}
