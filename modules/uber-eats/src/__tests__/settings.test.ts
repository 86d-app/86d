import { describe, expect, it } from "vitest";
import { createGetSettingsEndpoint } from "../admin/endpoints/get-settings";

describe("uber-eats settings endpoint", () => {
	it("returns configured: true when all credentials provided", async () => {
		const endpoint = createGetSettingsEndpoint({
			clientId: "client-abc-123",
			clientSecret: "secret-xyz-456",
			restaurantId: "store-id-789",
		});

		// biome-ignore lint/suspicious/noExplicitAny: test endpoint handler
		const handler = (endpoint as any).handler ?? (endpoint as any);
		const result = await handler({});

		expect(result.configured).toBe(true);
		expect(result.clientIdMasked).toBe("client-*******");
		expect(result.clientSecretMasked).toBe("secret-*******");
		expect(result.restaurantIdMasked).toBe("store-i*****");
	});

	it("returns configured: false when credentials missing", async () => {
		const endpoint = createGetSettingsEndpoint({});

		// biome-ignore lint/suspicious/noExplicitAny: test endpoint handler
		const handler = (endpoint as any).handler ?? (endpoint as any);
		const result = await handler({});

		expect(result.configured).toBe(false);
		expect(result.clientIdMasked).toBeNull();
		expect(result.clientSecretMasked).toBeNull();
		expect(result.restaurantIdMasked).toBeNull();
	});

	it("returns configured: false when partial credentials", async () => {
		const endpoint = createGetSettingsEndpoint({
			clientId: "client-abc-123",
		});

		// biome-ignore lint/suspicious/noExplicitAny: test endpoint handler
		const handler = (endpoint as any).handler ?? (endpoint as any);
		const result = await handler({});

		expect(result.configured).toBe(false);
		expect(result.clientIdMasked).toBe("client-*******");
		expect(result.clientSecretMasked).toBeNull();
	});

	it("masks short keys", async () => {
		const endpoint = createGetSettingsEndpoint({
			clientId: "abc",
			clientSecret: "def",
			restaurantId: "ghi",
		});

		// biome-ignore lint/suspicious/noExplicitAny: test endpoint handler
		const handler = (endpoint as any).handler ?? (endpoint as any);
		const result = await handler({});

		expect(result.clientIdMasked).toBe("****");
		expect(result.clientSecretMasked).toBe("****");
	});

	it("includes webhook URL", async () => {
		const endpoint = createGetSettingsEndpoint({});

		// biome-ignore lint/suspicious/noExplicitAny: test endpoint handler
		const handler = (endpoint as any).handler ?? (endpoint as any);
		const result = await handler({});

		expect(result.webhookUrl).toBe("/api/uber-eats/webhook");
	});
});
