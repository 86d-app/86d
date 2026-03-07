import { createAdminEndpoint, z } from "@86d-app/core";
import type { MediaController } from "../../service";

export const listFoldersEndpoint = createAdminEndpoint(
	"/admin/media/folders",
	{
		method: "GET",
		query: z.object({
			parentId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.media as MediaController;
		const folders = await controller.listFolders(ctx.query.parentId);
		return { folders };
	},
);
