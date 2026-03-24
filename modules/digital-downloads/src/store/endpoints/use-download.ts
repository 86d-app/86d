import { createStoreEndpoint, z } from "@86d-app/core";
import type { DigitalDownloadsController } from "../../service";

export const useDownload = createStoreEndpoint(
	"/downloads/:token",
	{
		method: "GET",
		params: z.object({ token: z.string().max(512) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"digital-downloads"
		] as DigitalDownloadsController;
		const result = await controller.useToken(ctx.params.token);
		if (!result.ok) {
			return { ok: false, reason: result.reason };
		}
		return { ok: true, url: result.file?.url, file: result.file };
	},
);
