import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { GamificationController } from "../../service";

export const playGameEndpoint = createStoreEndpoint(
	"/gamification/games/:id/play",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			email: z.string().email().max(320).optional(),
			customerId: z.string().max(200).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.gamification as GamificationController;
		try {
			const play = await controller.play(ctx.params.id, {
				email: ctx.body.email,
				customerId: ctx.body.customerId,
			});
			return { play };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to play";
			return { play: null, error: message };
		}
	},
);
