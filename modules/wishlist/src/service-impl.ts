import type { ModuleDataService } from "@86d-app/core";
import type { WishlistController, WishlistItem } from "./service";

export function createWishlistController(
	data: ModuleDataService,
): WishlistController {
	return {
		async addItem(params) {
			// Check for duplicate — same customer + product
			const existing = await data.findMany("wishlistItem", {
				where: { customerId: params.customerId, productId: params.productId },
				take: 1,
			});
			const existingItems = existing as unknown as WishlistItem[];
			if (existingItems.length > 0) {
				return existingItems[0];
			}

			const id = crypto.randomUUID();
			const item: WishlistItem = {
				id,
				customerId: params.customerId,
				productId: params.productId,
				productName: params.productName,
				productImage: params.productImage,
				note: params.note,
				addedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("wishlistItem", id, item as Record<string, any>);
			return item;
		},

		async removeItem(id) {
			const existing = await data.get("wishlistItem", id);
			if (!existing) return false;
			await data.delete("wishlistItem", id);
			return true;
		},

		async removeByProduct(customerId, productId) {
			const items = await data.findMany("wishlistItem", {
				where: { customerId, productId },
			});
			const found = items as unknown as WishlistItem[];
			if (found.length === 0) return false;
			for (const item of found) {
				await data.delete("wishlistItem", item.id);
			}
			return true;
		},

		async getItem(id) {
			const raw = await data.get("wishlistItem", id);
			if (!raw) return null;
			return raw as unknown as WishlistItem;
		},

		async isInWishlist(customerId, productId) {
			const items = await data.findMany("wishlistItem", {
				where: { customerId, productId },
				take: 1,
			});
			return (items as unknown as WishlistItem[]).length > 0;
		},

		async listByCustomer(customerId, params) {
			const all = await data.findMany("wishlistItem", {
				where: { customerId },
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as WishlistItem[];
		},

		async listAll(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.customerId) where.customerId = params.customerId;
			if (params?.productId) where.productId = params.productId;

			const all = await data.findMany("wishlistItem", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as WishlistItem[];
		},

		async countByCustomer(customerId) {
			const all = await data.findMany("wishlistItem", {
				where: { customerId },
			});
			return (all as unknown as WishlistItem[]).length;
		},

		async getSummary() {
			const all = await data.findMany("wishlistItem", {});
			const items = all as unknown as WishlistItem[];

			const productCounts = new Map<
				string,
				{ productId: string; productName: string; count: number }
			>();

			for (const item of items) {
				const entry = productCounts.get(item.productId);
				if (entry) {
					entry.count += 1;
				} else {
					productCounts.set(item.productId, {
						productId: item.productId,
						productName: item.productName,
						count: 1,
					});
				}
			}

			const topProducts = Array.from(productCounts.values())
				.sort((a, b) => b.count - a.count)
				.slice(0, 10);

			return {
				totalItems: items.length,
				topProducts,
			};
		},
	};
}
