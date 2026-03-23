import { createAdminEndpoint, z } from "@86d-app/core";

export const deleteCollection = createAdminEndpoint(
	"/admin/collections/:id/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		return ctx.context.controllers.collection.delete(ctx);
	},
);
