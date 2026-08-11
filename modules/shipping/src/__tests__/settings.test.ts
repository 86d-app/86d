import { describe, expect, it } from "vitest";

describe("shipping — module factory settings wiring", () => {
	it("includes the settings endpoint when EasyPost is not configured", async () => {
		const { default: shipping } = await import("../index");
		const mod = shipping({});

		expect(mod.endpoints?.admin).toHaveProperty("/admin/shipping/settings");
	});

	it("keeps store endpoints in no-credentials mode", async () => {
		const { default: shipping } = await import("../index");
		const mod = shipping({});

		expect(mod.endpoints?.store).toHaveProperty("/shipping/calculate");
	});

	it("does not activate EasyPost routes without webhook verification material", async () => {
		const { default: shipping } = await import("../index");
		const mod = shipping({ easypostApiKey: "EZTK_test" });

		expect(mod.endpoints?.store).not.toHaveProperty("/shipping/live-rates");
		expect(mod.endpoints?.store).not.toHaveProperty("/shipping/webhook");
	});

	it("activates EasyPost routes when API and webhook credentials are complete", async () => {
		const { default: shipping } = await import("../index");
		const mod = shipping({
			easypostApiKey: "EZTK_test",
			easypostWebhookSecret: "webhook-secret",
		});

		expect(mod.endpoints?.store).toHaveProperty("/shipping/live-rates");
		expect(mod.endpoints?.store).toHaveProperty("/shipping/webhook");
	});
});
