import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createTippingController } from "../service-impl";

/**
 * Store endpoint integration tests for the tipping module.
 *
 * These tests verify the business logic in store-facing endpoints:
 *
 * 1. get-settings: returns tip configuration (presets, limits)
 * 2. add-tip: adds a tip to an order
 * 3. get-tip-total: returns total tips for an order
 */

type DataService = ReturnType<typeof createMockDataService>;

// ── Simulate endpoint logic ─────────────────────────────────────────

async function simulateGetSettings(data: DataService) {
	const controller = createTippingController(data);
	const settings = await controller.getSettings();
	return { settings };
}

async function simulateAddTip(
	data: DataService,
	body: {
		orderId: string;
		amount: number;
		type: "preset" | "custom";
		percentage?: number;
	},
) {
	const controller = createTippingController(data);
	const tip = await controller.addTip(body);
	return { tip };
}

async function simulateGetTipTotal(data: DataService, orderId: string) {
	const controller = createTippingController(data);
	const total = await controller.getTipTotal(orderId);
	return { total };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("store endpoint: get settings — tip configuration", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns default tip settings", async () => {
		const result = await simulateGetSettings(data);

		expect("settings" in result).toBe(true);
		expect(result.settings).toBeDefined();
	});

	it("returns updated settings after configuration", async () => {
		const ctrl = createTippingController(data);
		await ctrl.updateSettings({
			presetPercents: [10, 15, 20, 25],
			allowCustom: true,
			maxAmount: 10000,
		});

		const result = await simulateGetSettings(data);

		expect(result.settings.presetPercents).toEqual([10, 15, 20, 25]);
		expect(result.settings.allowCustom).toBe(true);
	});
});

describe("store endpoint: add tip — tip an order", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("adds a custom tip", async () => {
		const result = await simulateAddTip(data, {
			orderId: "order_1",
			amount: 500,
			type: "custom",
		});

		expect("tip" in result).toBe(true);
		if ("tip" in result) {
			expect(result.tip.amount).toBe(500);
			expect(result.tip.orderId).toBe("order_1");
		}
	});

	it("adds a preset tip", async () => {
		const result = await simulateAddTip(data, {
			orderId: "order_2",
			amount: 300,
			type: "preset",
			percentage: 15,
		});

		expect("tip" in result).toBe(true);
		if ("tip" in result) {
			expect(result.tip.amount).toBe(300);
			expect(result.tip.type).toBe("preset");
		}
	});
});

describe("store endpoint: get tip total — order tip summary", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns total tips for an order", async () => {
		const ctrl = createTippingController(data);
		await ctrl.addTip({ orderId: "order_1", amount: 300, type: "custom" });
		await ctrl.addTip({ orderId: "order_1", amount: 200, type: "custom" });

		const result = await simulateGetTipTotal(data, "order_1");

		expect(result.total).toBe(500);
	});

	it("returns zero for order with no tips", async () => {
		const result = await simulateGetTipTotal(data, "order_none");

		expect(result.total).toBe(0);
	});
});
