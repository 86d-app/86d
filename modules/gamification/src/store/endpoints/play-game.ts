import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { GamificationController } from "../../service";

export const playGameEndpoint = createStoreEndpoint(
	"/gamification/games/:id/play",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({
			// email is only accepted for anonymous (unauthenticated) players
			email: z.string().email().max(320).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.gamification as GamificationController;

		// Derive identity from session — never trust client-provided customerId
		const customerId = ctx.context.session?.user.id;
		// For authenticated users, use session email; for anonymous, accept body email
		const email = customerId
			? (ctx.context.session?.user.email ?? ctx.body.email)
			: ctx.body.email;

		try {
			const play = await controller.play(ctx.params.id, {
				email,
				customerId,
			});
			return { play };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unable to play";
			return { play: null, error: message };
		}
	},
);
