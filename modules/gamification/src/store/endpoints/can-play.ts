import { createStoreEndpoint, z } from "@86d-app/core";
import type { GamificationController } from "../../service";

export const canPlayEndpoint = createStoreEndpoint(
	"/gamification/games/:id/can-play",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
		query: z.object({
			email: z.string().optional(),
			customerId: z.string().optional(),
			ipAddress: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.gamification as GamificationController;
		const result = await controller.canPlay(ctx.params.id, {
			email: ctx.query.email,
			customerId: ctx.query.customerId,
			ipAddress: ctx.query.ipAddress,
		});
		return result;
	},
);
