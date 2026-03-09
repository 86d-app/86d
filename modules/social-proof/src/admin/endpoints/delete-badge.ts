import { createAdminEndpoint } from "@86d-app/core";
import type { SocialProofController } from "../../service";

export const deleteBadge = createAdminEndpoint(
	"/admin/social-proof/badges/:id/delete",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.socialProof as SocialProofController;

		const deleted = await controller.deleteBadge(ctx.params.id);

		if (!deleted) {
			return { error: "Badge not found", status: 404 };
		}

		return { success: true };
	},
);
