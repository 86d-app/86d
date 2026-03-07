import { createAdminEndpoint, z } from "@86d-app/core";
import type { SettingsController } from "../../service";

export const getSettingEndpoint = createAdminEndpoint(
	"/admin/settings/:key",
	{
		method: "GET",
		params: z.object({ key: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.settings as SettingsController;
		const setting = await controller.get(ctx.params.key);
		if (!setting) return { error: "Setting not found" };
		return { setting };
	},
);
