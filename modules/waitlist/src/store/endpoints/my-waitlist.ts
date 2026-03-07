import { createStoreEndpoint, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const myWaitlist = createStoreEndpoint(
	"/waitlist/mine",
	{
		method: "GET",
		query: z.object({
			email: z.string().email(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const entries = await controller.listByEmail(ctx.query.email, {
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { entries };
	},
);
