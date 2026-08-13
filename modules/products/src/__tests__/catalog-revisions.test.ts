import { createMockTransactionRunner } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import {
	applyCatalogRevisionOperation,
	type CatalogRevisionContent,
	type CatalogRevisionOperationContext,
	digestCatalogRevisionContent,
} from "../catalog-revisions";

const content = {
	version: 1,
	currency: "USD",
	categories: [
		{
			id: "category-dogs",
			name: "Dogs",
			slug: "dogs",
			position: 0,
			isVisible: true,
			metadata: {},
		},
	],
	products: [
		{
			id: "product-leash",
			name: "Trail Leash",
			slug: "trail-leash",
			price: 2_500,
			status: "active",
			categoryId: "category-dogs",
			images: ["https://store.example/products/trail-leash.jpg"],
			tags: ["walking"],
			metadata: {},
			isFeatured: true,
		},
	],
	variants: [],
} satisfies CatalogRevisionContent;

function operationContext(occurredAt: string): CatalogRevisionOperationContext {
	return {
		actor: { type: "account", id: "account-owner" },
		authority: {
			id: "store-admin-authority",
			type: "custom_role",
			role: "admin",
			permissions: ["catalog:write"],
			storeId: "store-1",
		},
		occurredAt: new Date(occurredAt),
	};
}

describe("Catalog revision publication", () => {
	it("publishes one immutable fact and replays the same operation without duplicating it", async () => {
		const transactions = createMockTransactionRunner({ storeId: "store-1" });
		const digest = await digestCatalogRevisionContent(content);

		await transactions.transaction((transaction) =>
			applyCatalogRevisionOperation(
				transaction,
				{
					action: "create_draft",
					operationId: "catalog-create-0001",
					revisionId: "revision-1",
					content,
				},
				operationContext("2026-08-13T10:00:00.000Z"),
			),
		);
		await transactions.transaction((transaction) =>
			applyCatalogRevisionOperation(
				transaction,
				{
					action: "review",
					operationId: "catalog-review-0001",
					revisionId: "revision-1",
					expectedContentDigest: digest,
				},
				operationContext("2026-08-13T10:01:00.000Z"),
			),
		);
		const publish = () =>
			transactions.transaction((transaction) =>
				applyCatalogRevisionOperation(
					transaction,
					{
						action: "publish",
						operationId: "catalog-publish-0001",
						revisionId: "revision-1",
						expectedContentDigest: digest,
					},
					operationContext("2026-08-13T10:02:00.000Z"),
				),
			);

		expect(await publish()).toMatchObject({
			ok: true,
			decision: { state: "published", replayed: false },
		});
		expect(await publish()).toMatchObject({
			ok: true,
			decision: { state: "published", replayed: true },
		});
		expect(transactions.emitted).toEqual([
			expect.objectContaining({
				name: "catalog.published",
				version: 1,
				sourceModule: "products",
				payload: expect.objectContaining({
					revisionId: "revision-1",
					contentDigest: digest,
					productCount: 1,
				}),
			}),
		]);
	});

	it("rolls publication back when the durable fact cannot commit", async () => {
		const transactions = createMockTransactionRunner({
			beforeEmit() {
				throw new Error("outbox unavailable");
			},
		});
		const digest = await digestCatalogRevisionContent(content);

		await transactions.transaction((transaction) =>
			applyCatalogRevisionOperation(
				transaction,
				{
					action: "create_draft",
					operationId: "catalog-create-rollback",
					revisionId: "revision-rollback",
					content,
				},
				operationContext("2026-08-13T11:00:00.000Z"),
			),
		);
		await transactions.transaction((transaction) =>
			applyCatalogRevisionOperation(
				transaction,
				{
					action: "review",
					operationId: "catalog-review-rollback",
					revisionId: "revision-rollback",
					expectedContentDigest: digest,
				},
				operationContext("2026-08-13T11:01:00.000Z"),
			),
		);

		await expect(
			transactions.transaction((transaction) =>
				applyCatalogRevisionOperation(
					transaction,
					{
						action: "publish",
						operationId: "catalog-publish-rollback",
						revisionId: "revision-rollback",
						expectedContentDigest: digest,
					},
					operationContext("2026-08-13T11:02:00.000Z"),
				),
			),
		).rejects.toThrow("outbox unavailable");

		expect(
			await transactions.data.get("catalogRevision", "revision-rollback"),
		).toMatchObject({ state: "reviewed" });
		expect(
			await transactions.data.get("catalogRevisionHead", "catalog"),
		).not.toHaveProperty("publishedRevisionId");
		expect(transactions.emitted).toHaveLength(0);
	});
});
