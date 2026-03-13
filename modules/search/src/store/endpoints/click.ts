import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { SearchController } from "../../service";

export const clickEndpoint = createStoreEndpoint(
	"/search/click",
	{
		method: "POST",
		body: z.object({
			queryId: z.string().min(1).max(200),
			term: z.string().min(1).max(500).transform(sanitizeText),
			entityType: z.string().min(1).max(100),
			entityId: z.string().min(1).max(200),
			position: z.number().int().min(0).max(1000),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.search as SearchController;
		const click = await controller.recordClick(ctx.body);
		return { id: click.id };
	},
);
