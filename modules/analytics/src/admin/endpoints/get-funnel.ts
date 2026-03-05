import { createAdminEndpoint, z } from "@86d-app/core";
import type { AnalyticsController } from "../../service";

export const getFunnelEndpoint = createAdminEndpoint(
	"/admin/analytics/funnel",
	{
		method: "GET",
		query: z.object({
			since: z.string().optional(),
			until: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.analytics as AnalyticsController;
		const funnel = await controller.getConversionFunnel({
			since: ctx.query.since ? new Date(ctx.query.since) : undefined,
			until: ctx.query.until ? new Date(ctx.query.until) : undefined,
		});
		return { funnel };
	},
);
