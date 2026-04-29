import { describe, expect, it, vi } from "vitest";
import { exportTransactions } from "../admin/endpoints/export-transactions";
import { getStats } from "../admin/endpoints/get-stats";
import { listTransactions } from "../admin/endpoints/list-transactions";
import type { RevenueIntent } from "../service";
import { listCustomerTransactions } from "../store/endpoints/list-transactions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractHandler(
	ep: unknown,
): (ctx: Record<string, unknown>) => Promise<unknown> {
	const obj = ep as Record<string, unknown>;
	const fn = typeof obj.handler === "function" ? obj.handler : ep;
	return fn as (ctx: Record<string, unknown>) => Promise<unknown>;
}

function makeIntent(overrides: Partial<RevenueIntent> = {}): RevenueIntent {
	return {
		id: crypto.randomUUID(),
		amount: 1000,
		currency: "USD",
		status: "succeeded",
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function makeController(intents: RevenueIntent[]) {
	return {
		listIntents: vi.fn().mockResolvedValue(intents),
	};
}

function callAdmin(
	handler: (ctx: Record<string, unknown>) => Promise<unknown>,
	query: Record<string, string | undefined>,
	controller?: { listIntents: ReturnType<typeof vi.fn> },
) {
	return handler({
		query,
		context: { controllers: { payments: controller } },
	});
}

function callStore(
	handler: (ctx: Record<string, unknown>) => Promise<unknown>,
	query: Record<string, string | undefined>,
	session: { user: { id: string } } | null,
	controller?: { listIntents: ReturnType<typeof vi.fn> },
) {
	return handler({
		query,
		context: { session, controllers: { payments: controller } },
	});
}

const getStatsHandler = extractHandler(getStats);
const listHandler = extractHandler(listTransactions);
const exportHandler = extractHandler(exportTransactions);
const storeHandler = extractHandler(listCustomerTransactions);

// ── getStats ─────────────────────────────────────────────────────────────────

describe("admin /revenue/stats", () => {
	it("returns all-zero stats when no payments controller is installed", async () => {
		const result = (await callAdmin(getStatsHandler, {}, undefined)) as {
			totalVolume: number;
			transactionCount: number;
		};
		expect(result.totalVolume).toBe(0);
		expect(result.transactionCount).toBe(0);
	});

	it("aggregates succeeded intents into totalVolume", async () => {
		const controller = makeController([
			makeIntent({ status: "succeeded", amount: 2000 }),
			makeIntent({ status: "succeeded", amount: 3000 }),
			makeIntent({ status: "failed", amount: 9999 }),
		]);
		const result = (await callAdmin(getStatsHandler, {}, controller)) as {
			totalVolume: number;
			transactionCount: number;
		};
		expect(result.totalVolume).toBe(5000);
		expect(result.transactionCount).toBe(2);
	});

	it("respects the from/to date range filter", async () => {
		const old = makeIntent({
			status: "succeeded",
			amount: 9999,
			createdAt: new Date("2020-01-01"),
		});
		const recent = makeIntent({
			status: "succeeded",
			amount: 500,
			createdAt: new Date(),
		});
		const controller = makeController([old, recent]);
		const result = (await callAdmin(
			getStatsHandler,
			{ from: new Date(Date.now() - 86400000).toISOString() },
			controller,
		)) as { totalVolume: number };
		expect(result.totalVolume).toBe(500);
	});

	it("fetches up to 10 000 intents from the controller", async () => {
		const controller = makeController([]);
		await callAdmin(getStatsHandler, {}, controller);
		expect(controller.listIntents).toHaveBeenCalledWith({ take: 10000 });
	});
});

// ── listTransactions ──────────────────────────────────────────────────────────

describe("admin /revenue/transactions", () => {
	it("returns empty list when no payments controller is installed", async () => {
		const result = (await callAdmin(listHandler, {}, undefined)) as {
			transactions: unknown[];
			total: number;
		};
		expect(result.transactions).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it("returns paginated transactions sorted newest-first", async () => {
		const older = makeIntent({ createdAt: new Date("2024-01-01") });
		const newer = makeIntent({ createdAt: new Date("2024-06-01") });
		const controller = makeController([older, newer]);
		const result = (await callAdmin(
			listHandler,
			{ page: "1", limit: "2" },
			controller,
		)) as { transactions: Array<{ id: string }> };
		expect(result.transactions[0].id).toBe(newer.id);
	});

	it("filters by status", async () => {
		const succeeded = makeIntent({ status: "succeeded" });
		const failed = makeIntent({ status: "failed" });
		const controller = makeController([succeeded, failed]);
		const result = (await callAdmin(
			listHandler,
			{ status: "failed" },
			controller,
		)) as { transactions: Array<{ status: string }>; total: number };
		expect(result.total).toBe(1);
		expect(result.transactions[0].status).toBe("failed");
	});

	it("searches by email substring", async () => {
		const match = makeIntent({ email: "alice@example.com" });
		const noMatch = makeIntent({ email: "bob@example.com" });
		const controller = makeController([match, noMatch]);
		const result = (await callAdmin(
			listHandler,
			{ search: "alice" },
			controller,
		)) as { total: number };
		expect(result.total).toBe(1);
	});

	it("returns correct total across pages", async () => {
		const intents = Array.from({ length: 25 }, () => makeIntent());
		const controller = makeController(intents);
		const page1 = (await callAdmin(
			listHandler,
			{ page: "1", limit: "10" },
			controller,
		)) as { total: number; transactions: unknown[] };
		expect(page1.total).toBe(25);
		expect(page1.transactions).toHaveLength(10);
	});
});

// ── exportTransactions ────────────────────────────────────────────────────────

describe("admin /revenue/export", () => {
	it("returns a CSV string with a header row", async () => {
		const controller = makeController([
			makeIntent({ amount: 4999, currency: "USD" }),
		]);
		const result = (await callAdmin(exportHandler, {}, controller)) as {
			csv: string;
			count: number;
		};
		expect(result.csv).toContain("Date,Transaction ID,Status,Amount");
		expect(result.count).toBe(1);
	});

	it("returns empty CSV with header when no intents exist", async () => {
		const controller = makeController([]);
		const result = (await callAdmin(exportHandler, {}, controller)) as {
			csv: string;
			count: number;
		};
		expect(result.csv).toContain("Date,Transaction ID");
		expect(result.count).toBe(0);
	});

	it("returns empty CSV when no controller is installed", async () => {
		const result = (await callAdmin(exportHandler, {}, undefined)) as {
			csv: string;
			count: number;
		};
		expect(result.count).toBe(0);
	});
});

// ── store /revenue/transactions ───────────────────────────────────────────────

describe("store /revenue/transactions", () => {
	it("returns 401 when no session", async () => {
		const result = (await callStore(storeHandler, {}, null)) as {
			status: number;
		};
		expect(result.status).toBe(401);
	});

	it("returns empty list when no payments controller is installed", async () => {
		const result = (await callStore(
			storeHandler,
			{},
			{ user: { id: "cust_1" } },
			undefined,
		)) as { transactions: unknown[]; total: number };
		expect(result.transactions).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it("passes customerId to the controller so customers only see their own data", async () => {
		const controller = makeController([
			makeIntent({ customerId: "cust_1", amount: 1000 }),
		]);
		await callStore(storeHandler, {}, { user: { id: "cust_1" } }, controller);
		expect(controller.listIntents).toHaveBeenCalledWith(
			expect.objectContaining({ customerId: "cust_1" }),
		);
	});

	it("paginates results with a default page size of 10", async () => {
		const intents = Array.from({ length: 15 }, () =>
			makeIntent({ customerId: "cust_1" }),
		);
		const controller = makeController(intents);
		const result = (await callStore(
			storeHandler,
			{},
			{ user: { id: "cust_1" } },
			controller,
		)) as { transactions: unknown[]; total: number };
		expect(result.transactions).toHaveLength(10);
		expect(result.total).toBe(15);
	});

	it("filters by status", async () => {
		const intents = [
			makeIntent({ customerId: "cust_1", status: "succeeded" }),
			makeIntent({ customerId: "cust_1", status: "failed" }),
		];
		const controller = makeController(intents);
		const result = (await callStore(
			storeHandler,
			{ status: "succeeded" },
			{ user: { id: "cust_1" } },
			controller,
		)) as { total: number };
		expect(result.total).toBe(1);
	});
});
