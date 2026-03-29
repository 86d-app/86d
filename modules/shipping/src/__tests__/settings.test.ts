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
});
