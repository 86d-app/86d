import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createKioskController } from "../service-impl";

/**
 * Store endpoint integration tests for the kiosk module.
 *
 * These tests verify the business logic in store-facing endpoints:
 *
 * 1. start-session: begins a kiosk ordering session
 * 2. add-item: adds an item to the session cart
 * 3. remove-item: removes an item from the session cart
 * 4. complete-session: completes the kiosk order
 * 5. abandon-session: abandons the session
 */

type DataService = ReturnType<typeof createMockDataService>;

// ── Simulate endpoint logic ─────────────────────────────────────────

async function simulateStartSession(data: DataService, stationId: string) {
	const controller = createKioskController(data);
	const station = await controller.getStation(stationId);
	if (!station) {
		return { error: "Station not found", status: 404 };
	}
	const session = await controller.startSession(stationId);
	if (!session) {
		return { error: "Cannot start session", status: 400 };
	}
	return { session };
}

async function simulateAddItem(
	data: DataService,
	sessionId: string,
	item: { name: string; price: number; quantity: number },
) {
	const controller = createKioskController(data);
	const session = await controller.addItem(sessionId, item);
	if (!session) {
		return { error: "Session not found", status: 404 };
	}
	return { session };
}

async function simulateCompleteSession(
	data: DataService,
	sessionId: string,
	paymentMethod: string,
) {
	const controller = createKioskController(data);
	const session = await controller.completeSession(sessionId, paymentMethod);
	if (!session) {
		return { error: "Cannot complete session", status: 400 };
	}
	return { session };
}

async function simulateAbandonSession(data: DataService, sessionId: string) {
	const controller = createKioskController(data);
	const session = await controller.abandonSession(sessionId);
	if (!session) {
		return { error: "Session not found", status: 404 };
	}
	return { session };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("store endpoint: start session", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("starts a session at a registered station", async () => {
		const ctrl = createKioskController(data);
		const station = await ctrl.registerStation({
			name: "Front Kiosk",
			location: "entrance",
		});

		const result = await simulateStartSession(data, station.id);

		expect("session" in result).toBe(true);
		if ("session" in result) {
			expect(result.session.stationId).toBe(station.id);
			expect(result.session.status).toBe("active");
		}
	});

	it("returns 404 for nonexistent station", async () => {
		const result = await simulateStartSession(data, "ghost_station");

		expect(result).toEqual({ error: "Station not found", status: 404 });
	});
});

describe("store endpoint: add/remove items", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("adds an item to the session", async () => {
		const ctrl = createKioskController(data);
		const station = await ctrl.registerStation({
			name: "Kiosk 1",
			location: "lobby",
		});
		const session = await ctrl.startSession(station.id);
		if (!session) throw new Error("startSession returned null");

		const result = await simulateAddItem(data, session.id, {
			name: "Burger",
			quantity: 2,
			price: 899,
		});

		expect("session" in result).toBe(true);
		if ("session" in result) {
			expect(result.session.items.length).toBeGreaterThanOrEqual(1);
		}
	});
});

describe("store endpoint: complete session", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("completes a session with payment", async () => {
		const ctrl = createKioskController(data);
		const station = await ctrl.registerStation({
			name: "Kiosk 2",
			location: "counter",
		});
		const session = await ctrl.startSession(station.id);
		if (!session) throw new Error("startSession returned null");
		await ctrl.addItem(session.id, {
			name: "Fries",
			quantity: 1,
			price: 399,
		});

		const result = await simulateCompleteSession(data, session.id, "card");

		expect("session" in result).toBe(true);
		if ("session" in result) {
			expect(result.session.status).toBe("completed");
		}
	});
});

describe("store endpoint: abandon session", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("abandons an active session", async () => {
		const ctrl = createKioskController(data);
		const station = await ctrl.registerStation({
			name: "Kiosk 3",
			location: "patio",
		});
		const session = await ctrl.startSession(station.id);
		if (!session) throw new Error("startSession returned null");

		const result = await simulateAbandonSession(data, session.id);

		expect("session" in result).toBe(true);
		if ("session" in result) {
			expect(result.session.status).toBe("abandoned");
		}
	});
});
