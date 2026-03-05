import { createAdminEndpoint, z } from "@86d-app/core";

export const deleteVariant = createAdminEndpoint(
	"/admin/variants/:id",
	{
		method: "DELETE",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controllers = ctx.context.controllers;

		// Check if variant exists
		const existingVariant = await controllers.variant.getById(ctx);
		if (!existingVariant) {
			return {
				error: "Variant not found",
				status: 404,
			};
		}

		await controllers.variant.delete(ctx);

		return { success: true, message: "Variant deleted successfully" };
	},
);
