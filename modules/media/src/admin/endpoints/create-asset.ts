import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { MediaController } from "../../service";

export const createAssetEndpoint = createAdminEndpoint(
	"/admin/media",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(500).transform(sanitizeText),
			url: z.string().url(),
			mimeType: z.string().min(1).max(200),
			size: z.number().int().min(0),
			altText: z.string().max(1000).transform(sanitizeText).optional(),
			width: z.number().int().min(0).optional(),
			height: z.number().int().min(0).optional(),
			folder: z.string().max(200).optional(),
			tags: z.array(z.string().max(100)).max(50).optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.media as MediaController;
		const asset = await controller.createAsset({
			name: ctx.body.name,
			url: ctx.body.url,
			mimeType: ctx.body.mimeType,
			size: ctx.body.size,
			altText: ctx.body.altText,
			width: ctx.body.width,
			height: ctx.body.height,
			folder: ctx.body.folder,
			tags: ctx.body.tags,
			metadata: ctx.body.metadata,
		});
		return { asset };
	},
);
