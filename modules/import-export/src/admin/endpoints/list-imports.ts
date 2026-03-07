import { createAdminEndpoint, z } from "@86d-app/core";
import type { ImportExportController } from "../../service";

export const listImports = createAdminEndpoint(
	"/admin/import-export/imports",
	{
		method: "GET",
		query: z.object({
			type: z.string().optional(),
			status: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.importExport as ImportExportController;
		const jobs = await controller.listImports({
			type: ctx.query.type as
				| "products"
				| "customers"
				| "orders"
				| "inventory"
				| undefined,
			status: ctx.query.status as
				| "pending"
				| "validating"
				| "processing"
				| "completed"
				| "failed"
				| "cancelled"
				| undefined,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { jobs, total: jobs.length };
	},
);
