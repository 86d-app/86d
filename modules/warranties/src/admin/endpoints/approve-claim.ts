import { createAdminEndpoint, z } from "@86d-app/core";
import type { WarrantyController } from "../../service";

export const approveClaim = createAdminEndpoint(
	"/admin/warranties/claims/:id/approve",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			resolution: z.enum(["repair", "replace", "refund", "credit"]),
			adminNotes: z.string().max(2000).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.warranties as WarrantyController;
		const claim = await controller.approveClaim(
			ctx.params.id,
			ctx.body.resolution,
			ctx.body.adminNotes,
		);
		if (!claim) {
			return { error: "Claim not found", status: 404 };
		}
		return { claim };
	},
);
