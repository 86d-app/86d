import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ToastController } from "../../service";

export const syncMenuEndpoint = createStoreEndpoint(
	"/toast/sync/menu",
	{
		method: "POST",
		body: z.object({
			entityId: z.string().max(200).transform(sanitizeText),
			externalId: z.string().max(200).transform(sanitizeText),
			direction: z.enum(["inbound", "outbound"]).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.toast as ToastController;
		const record = await controller.syncMenu({
			entityId: ctx.body.entityId,
			externalId: ctx.body.externalId,
			direction: ctx.body.direction,
		});
		return { record };
	},
);
