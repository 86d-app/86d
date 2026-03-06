import { createStoreEndpoint, z } from "@86d-app/core";
import type { SearchController } from "../../service";

export const searchEndpoint = createStoreEndpoint(
	"/search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(1).max(500),
			type: z.string().optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
			sessionId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.search as SearchController;
		const { results, total } = await controller.search(ctx.query.q, {
			entityType: ctx.query.type,
			limit: ctx.query.limit ?? 20,
			skip: ctx.query.skip ?? 0,
		});

		// Record query for analytics (fire-and-forget)
		controller
			.recordQuery(ctx.query.q, total, ctx.query.sessionId)
			.catch(() => {});

		return {
			results: results.map((r) => ({
				id: r.item.id,
				entityType: r.item.entityType,
				entityId: r.item.entityId,
				title: r.item.title,
				url: r.item.url,
				image: r.item.image,
				score: r.score,
			})),
			total,
		};
	},
);
