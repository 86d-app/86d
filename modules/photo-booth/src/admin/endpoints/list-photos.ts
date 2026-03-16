import { createAdminEndpoint, z } from "@86d-app/core";
import type { PhotoBoothController } from "../../service";

export const listPhotosEndpoint = createAdminEndpoint(
	"/admin/photo-booth/photos",
	{
		method: "GET",
		query: z.object({
			sessionId: z.string().optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.photoBooth as PhotoBoothController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const photos = await controller.listPhotos({
			sessionId: ctx.query.sessionId,
			take: limit,
			skip,
		});
		return { photos, total: photos.length };
	},
);
