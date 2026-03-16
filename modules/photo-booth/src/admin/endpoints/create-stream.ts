import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { PhotoBoothController } from "../../service";

export const createStreamEndpoint = createAdminEndpoint(
	"/admin/photo-booth/streams/create",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText),
			settings: z.record(z.string().max(100), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.photoBooth as PhotoBoothController;
		const stream = await controller.createStream({
			name: ctx.body.name,
			settings: ctx.body.settings,
		});
		return { stream };
	},
);
