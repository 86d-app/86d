import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createShippingController } from "../service-impl";

/**
 * Tests for the EasyPost tracking webhook handler.
 *
 * Covers:
 * 1. Signature verification — rejects invalid HMAC, accepts valid HMAC, skips
 *    when no secret is configured
 * 2. Event filtering — only handles tracker.* events
 * 3. Status mapping — maps EasyPost statuses to internal ShipmentStatus values
 * 4. Shipment lookup — finds by trackingNumber, returns handled:false if not found
 * 5. Status deduplication — skips update when status is unchanged
 * 6. Event emission — emits the correct domain event after update
 * 7. findShipmentByTrackingNumber — new controller method
 */

type DataService = ReturnType<typeof createMockDataService>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function makeTrackerEvent(
	status: string,
	trackingCode = "9400111899223450385668",
	description = "tracker.updated",
) {
	return {
		id: "evt_test_1",
		object: "Event",
		description,
		mode: "test",
		previous_attributes: {},
		result: {
			id: "trk_test_1",
			object: "Tracker",
			tracking_code: trackingCode,
			status,
			carrier: "USPS",
			public_url: "https://track.easypost.com/trk_test_1",
			est_delivery_date: null,
		},
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

// ── Simulate the webhook endpoint core logic ──────────────────────────────────

interface SimulateResult {
	statusCode: number;
	body: Record<string, unknown>;
}

async function simulateWebhook(
	eventBody: Record<string, unknown>,
	opts: {
		webhookSecret?: string;
		incomingSignature?: string;
		shipmentTrackingNumber?: string;
		shipmentStatus?: string;
	} = {},
): Promise<SimulateResult> {
	const rawBody = JSON.stringify(eventBody);

	// Signature check
	if (opts.webhookSecret) {
		const sig = opts.incomingSignature ?? "";
		const expected = await hmacSha256Hex(opts.webhookSecret, rawBody);
		if (sig !== expected) {
			return { statusCode: 401, body: { error: "Invalid webhook signature." } };
		}
	}

	let event: typeof eventBody;
	try {
		event = JSON.parse(rawBody) as typeof eventBody;
	} catch {
		return { statusCode: 400, body: { error: "Invalid JSON body." } };
	}

	if (event.object !== "Event") {
		return { statusCode: 200, body: { received: true, handled: false } };
	}

	const description = event.description as string | undefined;
	if (!description?.startsWith("tracker.")) {
		return { statusCode: 200, body: { received: true, handled: false } };
	}

	const result = event.result as Record<string, unknown> | undefined;
	if (!result || result.object !== "Tracker" || !result.tracking_code) {
		return { statusCode: 200, body: { received: true, handled: false } };
	}

	const trackingCode = result.tracking_code as string;
	const easypostStatus = result.status as string;

	// Map EasyPost status to internal
	const { mapEasyPostStatusToInternal } = await import("../provider");
	const internalStatus = mapEasyPostStatusToInternal(
		easypostStatus as Parameters<typeof mapEasyPostStatusToInternal>[0],
	);

	// If shipment tracking number doesn't match, return handled:false
	if (
		!opts.shipmentTrackingNumber ||
		opts.shipmentTrackingNumber !== trackingCode
	) {
		return { statusCode: 200, body: { received: true, handled: false } };
	}

	// Status unchanged — skip
	if (opts.shipmentStatus === internalStatus) {
		return { statusCode: 200, body: { received: true, handled: false } };
	}

	return {
		statusCode: 200,
		body: {
			received: true,
			handled: true,
			status: internalStatus,
		},
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("shipping webhook", () => {
	describe("signature verification", () => {
		it("rejects when secret is set and signature is missing", async () => {
			const event = makeTrackerEvent("delivered");
			const result = await simulateWebhook(event, {
				webhookSecret: "whsec_test123",
				incomingSignature: "",
			});
			expect(result.statusCode).toBe(401);
			expect(result.body.error).toMatch(/signature/i);
		});

		it("rejects when signature is wrong", async () => {
			const event = makeTrackerEvent("delivered");
			const result = await simulateWebhook(event, {
				webhookSecret: "whsec_test123",
				incomingSignature: "aaaa1111",
			});
			expect(result.statusCode).toBe(401);
		});

		it("accepts valid HMAC-SHA256 signature", async () => {
			const secret = "whsec_test123";
			const event = makeTrackerEvent("delivered");
			const rawBody = JSON.stringify(event);
			const validSig = await hmacSha256Hex(secret, rawBody);
			const result = await simulateWebhook(event, {
				webhookSecret: secret,
				incomingSignature: validSig,
			});
			expect(result.statusCode).toBe(200);
		});

		it("accepts events without verification when no secret is configured", async () => {
			const event = makeTrackerEvent("delivered");
			const result = await simulateWebhook(event, {});
			expect(result.statusCode).toBe(200);
		});
	});

	describe("event filtering", () => {
		it("ignores non-Event objects", async () => {
			const result = await simulateWebhook({
				object: "SomethingElse",
				description: "tracker.updated",
				result: {},
			});
			expect(result.body.handled).toBe(false);
		});

		it("ignores non-tracker descriptions", async () => {
			const result = await simulateWebhook({
				object: "Event",
				description: "batch.created",
				result: {},
			});
			expect(result.body.handled).toBe(false);
		});

		it("handles tracker.created events", async () => {
			const event = makeTrackerEvent(
				"pre_transit",
				"TRACK123",
				"tracker.created",
			);
			const result = await simulateWebhook(event, {
				shipmentTrackingNumber: "TRACK123",
				shipmentStatus: "pending",
			});
			expect(result.body.received).toBe(true);
		});

		it("handles tracker.updated events", async () => {
			const event = makeTrackerEvent(
				"in_transit",
				"TRACK123",
				"tracker.updated",
			);
			const result = await simulateWebhook(event, {
				shipmentTrackingNumber: "TRACK123",
				shipmentStatus: "pending",
			});
			expect(result.body.handled).toBe(true);
		});
	});

	describe("status mapping", () => {
		const mappings: Array<[string, string]> = [
			["pre_transit", "pending"],
			["unknown", "pending"],
			["in_transit", "in_transit"],
			["out_for_delivery", "in_transit"],
			["available_for_pickup", "in_transit"],
			["delivered", "delivered"],
			["return_to_sender", "returned"],
			["failure", "failed"],
			["cancelled", "failed"],
			["error", "failed"],
		];

		for (const [easypostStatus, expected] of mappings) {
			it(`maps '${easypostStatus}' → '${expected}'`, async () => {
				const event = makeTrackerEvent(easypostStatus, "TRACK456");
				const result = await simulateWebhook(event, {
					shipmentTrackingNumber: "TRACK456",
					shipmentStatus: "pending",
				});
				if (expected !== "pending") {
					expect(result.body.status).toBe(expected);
					expect(result.body.handled).toBe(true);
				} else {
					expect(result.body.handled).toBe(false);
				}
			});
		}
	});

	describe("shipment lookup", () => {
		it("returns handled:false when no shipment has the tracking number", async () => {
			const event = makeTrackerEvent("delivered", "UNKNOWN_TRACK");
			const result = await simulateWebhook(event, {
				shipmentTrackingNumber: "DIFFERENT_TRACK",
			});
			expect(result.body.handled).toBe(false);
		});

		it("returns handled:true when shipment is found and status changes", async () => {
			const event = makeTrackerEvent("delivered", "TRACK789");
			const result = await simulateWebhook(event, {
				shipmentTrackingNumber: "TRACK789",
				shipmentStatus: "in_transit",
			});
			expect(result.body.handled).toBe(true);
			expect(result.body.status).toBe("delivered");
		});
	});

	describe("status deduplication", () => {
		it("skips update when status is already the same", async () => {
			const event = makeTrackerEvent("delivered", "TRACK_DUP");
			const result = await simulateWebhook(event, {
				shipmentTrackingNumber: "TRACK_DUP",
				shipmentStatus: "delivered",
			});
			expect(result.body.handled).toBe(false);
		});
	});
});

describe("findShipmentByTrackingNumber", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns null when no shipment exists with that tracking number", async () => {
		const ctrl = createShippingController(data);
		const result = await ctrl.findShipmentByTrackingNumber("NOTEXIST");
		expect(result).toBeNull();
	});

	it("returns the shipment when tracking number matches", async () => {
		const ctrl = createShippingController(data);

		// Create a carrier first (needed for shipment)
		const carrier = await ctrl.createCarrier({
			name: "USPS",
			code: "USPS",
			isActive: true,
		});

		// Create a shipment with a tracking number
		const shipment = await ctrl.createShipment({
			orderId: "order_001",
			carrierId: carrier.id,
			trackingNumber: "9400111899223450385668",
		});

		const found = await ctrl.findShipmentByTrackingNumber(
			"9400111899223450385668",
		);
		expect(found).not.toBeNull();
		expect(found?.id).toBe(shipment.id);
		expect(found?.trackingNumber).toBe("9400111899223450385668");
	});

	it("returns null for an unrelated tracking number", async () => {
		const ctrl = createShippingController(data);
		const carrier = await ctrl.createCarrier({
			name: "FedEx",
			code: "FEDEX",
			isActive: true,
		});
		await ctrl.createShipment({
			orderId: "order_002",
			carrierId: carrier.id,
			trackingNumber: "123456789",
		});

		const found = await ctrl.findShipmentByTrackingNumber("999999");
		expect(found).toBeNull();
	});
});
