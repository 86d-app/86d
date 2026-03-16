import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QrCodeController } from "../../service";

export const recordScanEndpoint = createStoreEndpoint(
	"/qr-codes/:id/scan",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			userAgent: z.string().max(500).transform(sanitizeText).optional(),
			ipAddress: z.string().max(45).transform(sanitizeText).optional(),
			referrer: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.qrCode as QrCodeController;
		const scan = await controller.recordScan(ctx.params.id, {
			userAgent: ctx.body.userAgent,
			ipAddress: ctx.body.ipAddress,
			referrer: ctx.body.referrer,
		});
		return { scan };
	},
);
