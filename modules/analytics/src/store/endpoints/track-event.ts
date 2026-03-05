import { createStoreEndpoint, z } from "@86d-app/core";
import type { AnalyticsController } from "../../service";

export const trackEventEndpoint = createStoreEndpoint(
	"/analytics/events",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(100),
			sessionId: z.string().optional(),
			customerId: z.string().optional(),
			productId: z.string().optional(),
			orderId: z.string().optional(),
			value: z.number().optional(),
			data: z.record(z.string(), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.analytics as AnalyticsController;
		const event = await controller.track({
			type: ctx.body.type,
			sessionId: ctx.body.sessionId,
			customerId: ctx.body.customerId,
			productId: ctx.body.productId,
			orderId: ctx.body.orderId,
			value: ctx.body.value,
			data: ctx.body.data,
		});
		return { event };
	},
);
