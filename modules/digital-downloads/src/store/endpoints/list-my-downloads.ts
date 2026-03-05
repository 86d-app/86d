import { createStoreEndpoint, z } from "@86d-app/core";
import type { DigitalDownloadsController } from "../../service";

export const listMyDownloads = createStoreEndpoint(
	"/downloads/me",
	{
		method: "GET",
		query: z.object({ email: z.string().email() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"digital-downloads"
		] as DigitalDownloadsController;
		const tokens = await controller.listTokensByEmail({
			email: ctx.query.email,
		});
		return { tokens };
	},
);
