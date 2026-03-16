import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { TikTokShopController } from "../../service";

export const updateListingEndpoint = createAdminEndpoint(
	"/admin/tiktok-shop/listings/:id",
	{
		method: "PUT",
		params: z.object({
			id: z.string().min(1).max(200),
		}),
		body: z.object({
			localProductId: z
				.string()
				.min(1)
				.max(200)
				.transform(sanitizeText)
				.optional(),
			externalProductId: z.string().max(200).transform(sanitizeText).optional(),
			title: z.string().min(1).max(500).transform(sanitizeText).optional(),
			status: z
				.enum(["draft", "pending", "active", "rejected", "suspended"])
				.optional(),
			syncStatus: z
				.enum(["pending", "synced", "failed", "outdated"])
				.optional(),
			error: z.string().max(1000).transform(sanitizeText).optional(),
			metadata: z.record(z.string().max(100), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.tiktokShop as TikTokShopController;
		const listing = await controller.updateListing(ctx.params.id, {
			localProductId: ctx.body.localProductId,
			externalProductId: ctx.body.externalProductId,
			title: ctx.body.title,
			status: ctx.body.status,
			syncStatus: ctx.body.syncStatus,
			error: ctx.body.error,
			metadata: ctx.body.metadata,
		});
		if (!listing) {
			return { error: "Listing not found" };
		}
		return { listing };
	},
);
