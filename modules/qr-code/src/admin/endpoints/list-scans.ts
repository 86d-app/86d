import { createAdminEndpoint, z } from "@86d-app/core";
import type { QrCodeController } from "../../service";

export const listScansEndpoint = createAdminEndpoint(
	"/admin/qr-codes/:id/scans",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.qrCode as QrCodeController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const scans = await controller.listScans(ctx.params.id, {
			take: limit,
			skip,
		});
		return { scans, total: scans.length };
	},
);
