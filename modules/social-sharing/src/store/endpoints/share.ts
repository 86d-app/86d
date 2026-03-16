import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { SocialSharingController } from "../../service";

export const shareEndpoint = createStoreEndpoint(
	"/social-sharing/share",
	{
		method: "POST",
		body: z.object({
			targetType: z.enum([
				"product",
				"collection",
				"page",
				"blog-post",
				"custom",
			]),
			targetId: z.string().max(200).transform(sanitizeText),
			network: z.enum([
				"twitter",
				"facebook",
				"pinterest",
				"linkedin",
				"whatsapp",
				"email",
				"copy-link",
			]),
			url: z.string().url().max(2000),
			referrer: z.string().max(2000).transform(sanitizeText).optional(),
			sessionId: z.string().max(200).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"social-sharing"
		] as SocialSharingController;
		const shareEvent = await controller.recordShare({
			targetType: ctx.body.targetType,
			targetId: ctx.body.targetId,
			network: ctx.body.network,
			url: ctx.body.url,
			referrer: ctx.body.referrer,
			sessionId: ctx.body.sessionId,
		});
		return { shareEvent };
	},
);
