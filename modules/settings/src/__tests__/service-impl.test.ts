import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createSettingsController } from "../service-impl";

describe("createSettingsController", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createSettingsController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createSettingsController(mockData);
	});

	// ── set ──────────────────────────────────────────────────────────────

	describe("set", () => {
		it("creates a new setting", async () => {
			const setting = await controller.set(
				"general.store_name",
				"My Store",
				"general",
			);
			expect(setting.key).toBe("general.store_name");
			expect(setting.value).toBe("My Store");
			expect(setting.group).toBe("general");
			expect(setting.id).toBeDefined();
			expect(setting.updatedAt).toBeInstanceOf(Date);
		});

		it("updates an existing setting by key", async () => {
			await controller.set("general.store_name", "Store A", "general");
			const updated = await controller.set(
				"general.store_name",
				"Store B",
				"general",
			);
			expect(updated.value).toBe("Store B");
		});

		it("infers group from key prefix", async () => {
			const setting = await controller.set("contact.support_email", "a@b.com");
			expect(setting.group).toBe("contact");
		});

		it("defaults to general group for unknown prefix", async () => {
			const setting = await controller.set("unknown.key", "value");
			expect(setting.group).toBe("general");
		});
	});

	// ── get ──────────────────────────────────────────────────────────────

	describe("get", () => {
		it("returns null for non-existent setting", async () => {
			const result = await controller.get("nonexistent.key");
			expect(result).toBeNull();
		});

		it("returns the setting by key", async () => {
			await controller.set("general.store_name", "Test Store", "general");
			const result = await controller.get("general.store_name");
			expect(result).not.toBeNull();
			expect(result?.value).toBe("Test Store");
		});
	});

	// ── getValue ─────────────────────────────────────────────────────────

	describe("getValue", () => {
		it("returns null for non-existent key", async () => {
			const result = await controller.getValue("nonexistent.key");
			expect(result).toBeNull();
		});

		it("returns the value string", async () => {
			await controller.set("general.store_name", "My Store", "general");
			const value = await controller.getValue("general.store_name");
			expect(value).toBe("My Store");
		});
	});

	// ── setBulk ──────────────────────────────────────────────────────────

	describe("setBulk", () => {
		it("sets multiple settings at once", async () => {
			const results = await controller.setBulk([
				{ key: "general.store_name", value: "Bulk Store" },
				{ key: "contact.support_email", value: "bulk@test.com" },
				{ key: "social.facebook", value: "https://facebook.com/bulk" },
			]);
			expect(results).toHaveLength(3);
			expect(results[0].key).toBe("general.store_name");
			expect(results[1].key).toBe("contact.support_email");
			expect(results[2].key).toBe("social.facebook");
		});

		it("updates existing settings in bulk", async () => {
			await controller.set("general.store_name", "Old Name");
			const results = await controller.setBulk([
				{ key: "general.store_name", value: "New Name" },
			]);
			expect(results[0].value).toBe("New Name");
		});
	});

	// ── getByGroup ───────────────────────────────────────────────────────

	describe("getByGroup", () => {
		it("returns empty array for group with no settings", async () => {
			const results = await controller.getByGroup("social");
			expect(results).toEqual([]);
		});

		it("returns only settings from the specified group", async () => {
			await controller.set("general.store_name", "Store", "general");
			await controller.set("contact.support_email", "a@b.com", "contact");
			await controller.set("contact.support_phone", "555-1234", "contact");

			const contactSettings = await controller.getByGroup("contact");
			expect(contactSettings).toHaveLength(2);
			for (const s of contactSettings) {
				expect(s.group).toBe("contact");
			}
		});
	});

	// ── getAll ────────────────────────────────────────────────────────────

	describe("getAll", () => {
		it("returns all settings", async () => {
			await controller.set("general.store_name", "Store", "general");
			await controller.set("contact.support_email", "a@b.com", "contact");

			const all = await controller.getAll();
			expect(all).toHaveLength(2);
		});

		it("returns empty array when no settings exist", async () => {
			const all = await controller.getAll();
			expect(all).toEqual([]);
		});
	});

	// ── getPublic ─────────────────────────────────────────────────────────

	describe("getPublic", () => {
		it("returns only public settings", async () => {
			await controller.set("general.store_name", "Public Store", "general");
			await controller.set("contact.support_email", "pub@test.com", "contact");
			await controller.set("social.facebook", "https://fb.com/s", "social");
			await controller.set("commerce.currency", "USD", "commerce");
			await controller.set("legal.return_policy", "No returns", "legal");

			const pub = await controller.getPublic();
			expect(pub["general.store_name"]).toBe("Public Store");
			expect(pub["contact.support_email"]).toBe("pub@test.com");
			expect(pub["social.facebook"]).toBe("https://fb.com/s");
			// commerce and legal are not public
			expect(pub["commerce.currency"]).toBeUndefined();
			expect(pub["legal.return_policy"]).toBeUndefined();
		});

		it("includes appearance settings in public", async () => {
			await controller.set("appearance.brand_color", "#ff0000", "appearance");
			const pub = await controller.getPublic();
			expect(pub["appearance.brand_color"]).toBe("#ff0000");
		});

		it("returns empty object when no settings exist", async () => {
			const pub = await controller.getPublic();
			expect(pub).toEqual({});
		});
	});

	// ── delete ────────────────────────────────────────────────────────────

	describe("delete", () => {
		it("returns false for non-existent setting", async () => {
			const result = await controller.delete("nonexistent.key");
			expect(result).toBe(false);
		});

		it("deletes an existing setting", async () => {
			await controller.set("general.store_name", "To Delete", "general");
			const deleted = await controller.delete("general.store_name");
			expect(deleted).toBe(true);

			const result = await controller.get("general.store_name");
			expect(result).toBeNull();
		});
	});
});
