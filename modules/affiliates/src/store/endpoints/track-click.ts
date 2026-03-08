import { createStoreEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const trackClickEndpoint = createStoreEndpoint(
	"/affiliates/track",
	{
		method: "POST",
		body: z.object({
			slug: z.string().max(20),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;

		const link = await controller.getLinkBySlug(ctx.body.slug);
		if (!link) return { error: "Link not found" };
		if (!link.active) return { error: "Link is no longer active" };

		await controller.recordClick(link.id);
		return { targetUrl: link.targetUrl };
	},
);
