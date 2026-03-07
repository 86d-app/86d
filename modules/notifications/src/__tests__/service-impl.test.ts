import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createNotificationsController } from "../service-impl";

describe("createNotificationsController", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createNotificationsController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createNotificationsController(mockData);
	});

	// ── create ──────────────────────────────────────────────────────────

	describe("create", () => {
		it("creates a notification with defaults", async () => {
			const n = await controller.create({
				customerId: "cust-1",
				title: "Order shipped",
				body: "Your order #1234 has shipped.",
			});
			expect(n.id).toBeDefined();
			expect(n.customerId).toBe("cust-1");
			expect(n.title).toBe("Order shipped");
			expect(n.body).toBe("Your order #1234 has shipped.");
			expect(n.type).toBe("info");
			expect(n.channel).toBe("in_app");
			expect(n.read).toBe(false);
			expect(n.readAt).toBeUndefined();
			expect(n.metadata).toEqual({});
			expect(n.createdAt).toBeInstanceOf(Date);
		});

		it("creates with custom type and channel", async () => {
			const n = await controller.create({
				customerId: "cust-1",
				type: "shipping",
				channel: "both",
				title: "Package delivered",
				body: "Your package has been delivered.",
			});
			expect(n.type).toBe("shipping");
			expect(n.channel).toBe("both");
		});

		it("creates with actionUrl", async () => {
			const n = await controller.create({
				customerId: "cust-1",
				title: "New sale",
				body: "Check out our sale!",
				actionUrl: "https://store.example.com/sale",
			});
			expect(n.actionUrl).toBe("https://store.example.com/sale");
		});

		it("creates with metadata", async () => {
			const n = await controller.create({
				customerId: "cust-1",
				title: "Order update",
				body: "Order status changed",
				metadata: { orderId: "order-123" },
			});
			expect(n.metadata).toEqual({ orderId: "order-123" });
		});

		it("assigns unique ids", async () => {
			const a = await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			const b = await controller.create({
				customerId: "cust-1",
				title: "B",
				body: "b",
			});
			expect(a.id).not.toBe(b.id);
		});
	});

	// ── get ─────────────────────────────────────────────────────────────

	describe("get", () => {
		it("returns notification by id", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Test",
				body: "Test body",
			});
			const found = await controller.get(created.id);
			expect(found?.title).toBe("Test");
		});

		it("returns null for non-existent id", async () => {
			const found = await controller.get("missing");
			expect(found).toBeNull();
		});
	});

	// ── update ──────────────────────────────────────────────────────────

	describe("update", () => {
		it("updates notification title and body", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Original",
				body: "Original body",
			});
			const updated = await controller.update(created.id, {
				title: "Updated",
				body: "Updated body",
			});
			expect(updated?.title).toBe("Updated");
			expect(updated?.body).toBe("Updated body");
		});

		it("updates actionUrl", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Test",
				body: "Test",
			});
			const updated = await controller.update(created.id, {
				actionUrl: "https://example.com/new",
			});
			expect(updated?.actionUrl).toBe("https://example.com/new");
		});

		it("updates metadata", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Test",
				body: "Test",
				metadata: { old: true },
			});
			const updated = await controller.update(created.id, {
				metadata: { new: true },
			});
			expect(updated?.metadata).toEqual({ new: true });
		});

		it("returns null for non-existent notification", async () => {
			const result = await controller.update("missing", {
				title: "Nope",
			});
			expect(result).toBeNull();
		});

		it("preserves fields not being updated", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Keep me",
				body: "Original body",
			});
			const updated = await controller.update(created.id, {
				title: "Changed",
			});
			expect(updated?.body).toBe("Original body");
			expect(updated?.customerId).toBe("cust-1");
		});
	});

	// ── delete ──────────────────────────────────────────────────────────

	describe("delete", () => {
		it("deletes an existing notification", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Delete me",
				body: "Body",
			});
			const result = await controller.delete(created.id);
			expect(result).toBe(true);
			const found = await controller.get(created.id);
			expect(found).toBeNull();
		});

		it("returns false for non-existent notification", async () => {
			const result = await controller.delete("missing");
			expect(result).toBe(false);
		});
	});

	// ── list ────────────────────────────────────────────────────────────

	describe("list", () => {
		it("lists all notifications", async () => {
			await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			await controller.create({
				customerId: "cust-2",
				title: "B",
				body: "b",
			});
			const all = await controller.list();
			expect(all).toHaveLength(2);
		});

		it("filters by customerId", async () => {
			await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			await controller.create({
				customerId: "cust-2",
				title: "B",
				body: "b",
			});
			const filtered = await controller.list({ customerId: "cust-1" });
			expect(filtered).toHaveLength(1);
			expect(filtered[0].customerId).toBe("cust-1");
		});

		it("filters by type", async () => {
			await controller.create({
				customerId: "cust-1",
				type: "order",
				title: "Order",
				body: "o",
			});
			await controller.create({
				customerId: "cust-1",
				type: "shipping",
				title: "Ship",
				body: "s",
			});
			const orders = await controller.list({ type: "order" });
			expect(orders).toHaveLength(1);
			expect(orders[0].type).toBe("order");
		});

		it("filters by read status", async () => {
			const n1 = await controller.create({
				customerId: "cust-1",
				title: "Unread",
				body: "u",
			});
			await controller.create({
				customerId: "cust-1",
				title: "Also unread",
				body: "u",
			});
			await controller.markRead(n1.id);

			const unread = await controller.list({ read: false });
			expect(unread).toHaveLength(1);
			expect(unread[0].title).toBe("Also unread");

			const read = await controller.list({ read: true });
			expect(read).toHaveLength(1);
			expect(read[0].title).toBe("Unread");
		});

		it("supports take and skip", async () => {
			for (let i = 0; i < 5; i++) {
				await controller.create({
					customerId: "cust-1",
					title: `N${i}`,
					body: `b${i}`,
				});
			}
			const page = await controller.list({ take: 2, skip: 1 });
			expect(page).toHaveLength(2);
		});

		it("returns empty array when no notifications exist", async () => {
			const result = await controller.list();
			expect(result).toEqual([]);
		});
	});

	// ── markRead ────────────────────────────────────────────────────────

	describe("markRead", () => {
		it("marks notification as read", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Unread",
				body: "Body",
			});
			expect(created.read).toBe(false);

			const result = await controller.markRead(created.id);
			expect(result?.read).toBe(true);
			expect(result?.readAt).toBeInstanceOf(Date);
		});

		it("is idempotent for already-read notifications", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Test",
				body: "Body",
			});
			const first = await controller.markRead(created.id);
			const second = await controller.markRead(created.id);
			expect(second?.read).toBe(true);
			expect(second?.readAt).toEqual(first?.readAt);
		});

		it("returns null for non-existent notification", async () => {
			const result = await controller.markRead("missing");
			expect(result).toBeNull();
		});
	});

	// ── markAllRead ─────────────────────────────────────────────────────

	describe("markAllRead", () => {
		it("marks all customer notifications as read", async () => {
			await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			await controller.create({
				customerId: "cust-1",
				title: "B",
				body: "b",
			});
			await controller.create({
				customerId: "cust-2",
				title: "C",
				body: "c",
			});

			const count = await controller.markAllRead("cust-1");
			expect(count).toBe(2);

			const cust1 = await controller.list({
				customerId: "cust-1",
				read: false,
			});
			expect(cust1).toHaveLength(0);

			// cust-2 unchanged
			const cust2 = await controller.list({
				customerId: "cust-2",
				read: false,
			});
			expect(cust2).toHaveLength(1);
		});

		it("returns 0 when no unread notifications", async () => {
			const count = await controller.markAllRead("cust-1");
			expect(count).toBe(0);
		});

		it("skips already-read notifications", async () => {
			const n = await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			await controller.markRead(n.id);

			const count = await controller.markAllRead("cust-1");
			expect(count).toBe(0);
		});
	});

	// ── unreadCount ─────────────────────────────────────────────────────

	describe("unreadCount", () => {
		it("counts unread notifications for a customer", async () => {
			await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			await controller.create({
				customerId: "cust-1",
				title: "B",
				body: "b",
			});
			const n3 = await controller.create({
				customerId: "cust-1",
				title: "C",
				body: "c",
			});
			await controller.markRead(n3.id);

			const count = await controller.unreadCount("cust-1");
			expect(count).toBe(2);
		});

		it("returns 0 when no notifications exist", async () => {
			const count = await controller.unreadCount("cust-1");
			expect(count).toBe(0);
		});

		it("does not count other customer notifications", async () => {
			await controller.create({
				customerId: "cust-2",
				title: "Other",
				body: "o",
			});
			const count = await controller.unreadCount("cust-1");
			expect(count).toBe(0);
		});
	});

	// ── getStats ────────────────────────────────────────────────────────

	describe("getStats", () => {
		it("returns zeroes when no notifications exist", async () => {
			const stats = await controller.getStats();
			expect(stats.total).toBe(0);
			expect(stats.unread).toBe(0);
			expect(stats.byType).toEqual({});
		});

		it("counts total and unread notifications", async () => {
			const n1 = await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			await controller.create({
				customerId: "cust-1",
				title: "B",
				body: "b",
			});
			await controller.markRead(n1.id);

			const stats = await controller.getStats();
			expect(stats.total).toBe(2);
			expect(stats.unread).toBe(1);
		});

		it("groups notifications by type", async () => {
			await controller.create({
				customerId: "cust-1",
				type: "order",
				title: "O1",
				body: "o",
			});
			await controller.create({
				customerId: "cust-1",
				type: "order",
				title: "O2",
				body: "o",
			});
			await controller.create({
				customerId: "cust-1",
				type: "shipping",
				title: "S1",
				body: "s",
			});
			await controller.create({
				customerId: "cust-1",
				type: "info",
				title: "I1",
				body: "i",
			});

			const stats = await controller.getStats();
			expect(stats.byType.order).toBe(2);
			expect(stats.byType.shipping).toBe(1);
			expect(stats.byType.info).toBe(1);
		});
	});

	// ── bulkDelete ──────────────────────────────────────────────────────

	describe("bulkDelete", () => {
		it("deletes multiple notifications", async () => {
			const a = await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			const b = await controller.create({
				customerId: "cust-1",
				title: "B",
				body: "b",
			});
			await controller.create({
				customerId: "cust-1",
				title: "C",
				body: "c",
			});

			const count = await controller.bulkDelete([a.id, b.id]);
			expect(count).toBe(2);

			const remaining = await controller.list();
			expect(remaining).toHaveLength(1);
			expect(remaining[0].title).toBe("C");
		});

		it("skips non-existent ids", async () => {
			const a = await controller.create({
				customerId: "cust-1",
				title: "A",
				body: "a",
			});
			const count = await controller.bulkDelete([a.id, "missing"]);
			expect(count).toBe(1);
		});

		it("returns 0 for empty results", async () => {
			const count = await controller.bulkDelete(["missing-1", "missing-2"]);
			expect(count).toBe(0);
		});
	});

	// ── getPreferences ──────────────────────────────────────────────────

	describe("getPreferences", () => {
		it("returns defaults for new customer", async () => {
			const prefs = await controller.getPreferences("cust-1");
			expect(prefs.customerId).toBe("cust-1");
			expect(prefs.orderUpdates).toBe(true);
			expect(prefs.promotions).toBe(true);
			expect(prefs.shippingAlerts).toBe(true);
			expect(prefs.accountAlerts).toBe(true);
			expect(prefs.id).toBeDefined();
		});

		it("returns saved preferences after update", async () => {
			await controller.updatePreferences("cust-1", {
				promotions: false,
			});
			const prefs = await controller.getPreferences("cust-1");
			expect(prefs.promotions).toBe(false);
			expect(prefs.orderUpdates).toBe(true);
		});
	});

	// ── updatePreferences ───────────────────────────────────────────────

	describe("updatePreferences", () => {
		it("creates preferences on first update", async () => {
			const prefs = await controller.updatePreferences("cust-1", {
				promotions: false,
			});
			expect(prefs.customerId).toBe("cust-1");
			expect(prefs.promotions).toBe(false);
			expect(prefs.orderUpdates).toBe(true);
			expect(prefs.shippingAlerts).toBe(true);
			expect(prefs.accountAlerts).toBe(true);
		});

		it("updates specific fields", async () => {
			await controller.updatePreferences("cust-1", {
				orderUpdates: false,
				shippingAlerts: false,
			});
			const prefs = await controller.getPreferences("cust-1");
			expect(prefs.orderUpdates).toBe(false);
			expect(prefs.shippingAlerts).toBe(false);
			expect(prefs.promotions).toBe(true);
			expect(prefs.accountAlerts).toBe(true);
		});

		it("updates existing preferences", async () => {
			await controller.updatePreferences("cust-1", {
				promotions: false,
			});
			const updated = await controller.updatePreferences("cust-1", {
				promotions: true,
				accountAlerts: false,
			});
			expect(updated.promotions).toBe(true);
			expect(updated.accountAlerts).toBe(false);
		});

		it("sets updatedAt timestamp", async () => {
			const prefs = await controller.updatePreferences("cust-1", {
				promotions: false,
			});
			expect(prefs.updatedAt).toBeInstanceOf(Date);
		});

		it("preserves id across updates", async () => {
			const first = await controller.updatePreferences("cust-1", {
				promotions: false,
			});
			const second = await controller.updatePreferences("cust-1", {
				orderUpdates: false,
			});
			expect(second.id).toBe(first.id);
		});
	});

	// ── full lifecycle ──────────────────────────────────────────────────

	describe("full lifecycle", () => {
		it("create → markRead → get shows read state", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Lifecycle test",
				body: "Testing",
			});
			await controller.markRead(created.id);
			const found = await controller.get(created.id);
			expect(found?.read).toBe(true);
			expect(found?.readAt).toBeInstanceOf(Date);
		});

		it("create → delete → get returns null", async () => {
			const created = await controller.create({
				customerId: "cust-1",
				title: "Delete test",
				body: "Testing",
			});
			await controller.delete(created.id);
			const found = await controller.get(created.id);
			expect(found).toBeNull();
		});

		it("create many → markAllRead → unreadCount is 0", async () => {
			for (let i = 0; i < 5; i++) {
				await controller.create({
					customerId: "cust-1",
					title: `N${i}`,
					body: `b${i}`,
				});
			}
			expect(await controller.unreadCount("cust-1")).toBe(5);
			await controller.markAllRead("cust-1");
			expect(await controller.unreadCount("cust-1")).toBe(0);
		});

		it("multiple customers have isolated notifications", async () => {
			await controller.create({
				customerId: "cust-1",
				title: "For cust-1",
				body: "b",
			});
			await controller.create({
				customerId: "cust-2",
				title: "For cust-2",
				body: "b",
			});

			const cust1 = await controller.list({ customerId: "cust-1" });
			const cust2 = await controller.list({ customerId: "cust-2" });
			expect(cust1).toHaveLength(1);
			expect(cust2).toHaveLength(1);
			expect(cust1[0].title).toBe("For cust-1");
			expect(cust2[0].title).toBe("For cust-2");
		});

		it("preferences are isolated per customer", async () => {
			await controller.updatePreferences("cust-1", {
				promotions: false,
			});
			await controller.updatePreferences("cust-2", {
				shippingAlerts: false,
			});

			const prefs1 = await controller.getPreferences("cust-1");
			const prefs2 = await controller.getPreferences("cust-2");
			expect(prefs1.promotions).toBe(false);
			expect(prefs1.shippingAlerts).toBe(true);
			expect(prefs2.promotions).toBe(true);
			expect(prefs2.shippingAlerts).toBe(false);
		});
	});
});
