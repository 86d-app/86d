import { createStoreEndpoint, z } from "@86d-app/core";
import type { AnalyticsController } from "../../service";

export const recentlyViewedEndpoint = createStoreEndpoint(
	"/analytics/recently-viewed",
	{
		method: "GET",
		query: z.object({
			sessionId: z.string().optional(),
			customerId: z.string().optional(),
			excludeProductId: z.string().optional(),
			limit: z.coerce.number().int().min(1).max(20).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.analytics as AnalyticsController;
		const items = await controller.getRecentlyViewed({
			sessionId: ctx.query.sessionId,
			customerId: ctx.query.customerId,
			excludeProductId: ctx.query.excludeProductId,
			limit: ctx.query.limit,
		});
		return { items };
	},
);
