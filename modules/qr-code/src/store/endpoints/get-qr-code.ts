import { createStoreEndpoint, z } from "@86d-app/core";
import type { QrCodeController } from "../../service";

export const getQrCodeEndpoint = createStoreEndpoint(
	"/qr-codes/:id",
	{
		method: "GET",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.qrCode as QrCodeController;
		const qrCode = await controller.get(ctx.params.id);
		if (!qrCode || !qrCode.isActive) return { qrCode: null };
		return { qrCode };
	},
);
