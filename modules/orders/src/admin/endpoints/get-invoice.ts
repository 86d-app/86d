import { createAdminEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const adminGetInvoice = createAdminEndpoint(
	"/admin/orders/:id/invoice",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
		query: z.object({ storeName: z.string().optional() }).optional(),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;
		const storeName =
			(ctx.query as { storeName?: string } | undefined)?.storeName ??
			"86d Store";
		const invoice = await controller.getInvoiceData(ctx.params.id, storeName);
		if (!invoice) {
			return { error: "Order not found", status: 404 };
		}
		return { invoice };
	},
);
