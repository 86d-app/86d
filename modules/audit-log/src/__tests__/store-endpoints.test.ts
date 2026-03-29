import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import type { CreateAuditEntryParams } from "../service";
import { createAuditLogController } from "../service-impl";

/**
 * Store endpoint integration tests for the audit-log module.
 *
 * These tests verify the business logic in endpoints:
 *
 * 1. log: creates an audit entry
 * 2. list: retrieves paginated audit entries
 * 3. list-for-resource: retrieves entries for a specific resource
 */

type DataService = ReturnType<typeof createMockDataService>;

// ── Simulate endpoint logic ─────────────────────────────────────────

async function simulateLog(data: DataService, body: CreateAuditEntryParams) {
	const controller = createAuditLogController(data);
	const entry = await controller.log(body);
	return { entry };
}

async function simulateList(
	data: DataService,
	query: { take?: number; skip?: number } = {},
) {
	const controller = createAuditLogController(data);
	const result = await controller.list(query);
	return result;
}

async function simulateListForResource(
	data: DataService,
	resource: string,
	resourceId: string,
) {
	const controller = createAuditLogController(data);
	const entries = await controller.listForResource(resource, resourceId);
	return { entries };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("store endpoint: log audit entry", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("creates an audit entry", async () => {
		const result = await simulateLog(data, {
			action: "create",
			resource: "product",
			resourceId: "prod_1",
			actorId: "admin_1",
			description: "Created product prod_1",
		});

		expect("entry" in result).toBe(true);
		if ("entry" in result) {
			expect(result.entry.action).toBe("create");
			expect(result.entry.resource).toBe("product");
		}
	});
});

describe("store endpoint: list audit entries", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns paginated audit entries", async () => {
		const ctrl = createAuditLogController(data);
		await ctrl.log({
			action: "create",
			resource: "product",
			resourceId: "prod_1",
			actorId: "admin_1",
			description: "Created product prod_1",
		});
		await ctrl.log({
			action: "update",
			resource: "product",
			resourceId: "prod_1",
			actorId: "admin_1",
			description: "Updated product prod_1",
		});

		const result = await simulateList(data);

		expect(result.entries).toHaveLength(2);
		expect(result.total).toBe(2);
	});

	it("returns empty when no entries", async () => {
		const result = await simulateList(data);

		expect(result.entries).toHaveLength(0);
	});
});

describe("store endpoint: list for resource", () => {
	let data: DataService;

	beforeEach(() => {
		data = createMockDataService();
	});

	it("returns entries for a specific resource", async () => {
		const ctrl = createAuditLogController(data);
		await ctrl.log({
			action: "create",
			resource: "product",
			resourceId: "prod_1",
			actorId: "admin_1",
			description: "Created product prod_1",
		});
		await ctrl.log({
			action: "create",
			resource: "order",
			resourceId: "order_1",
			actorId: "admin_1",
			description: "Created order order_1",
		});

		const result = await simulateListForResource(data, "product", "prod_1");

		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].resource).toBe("product");
	});
});
