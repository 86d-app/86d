import { createAdminEndpoint, z } from "@86d-app/core";
import type { DigitalDownloadsController } from "../../service";

export const revokeToken = createAdminEndpoint(
	"/admin/downloads/tokens/:id/revoke",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"digital-downloads"
		] as DigitalDownloadsController;
		const revoked = await controller.revokeTokenById(ctx.params.id);
		if (!revoked) return { error: "Token not found", status: 404 };
		return { success: true };
	},
);
