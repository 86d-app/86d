import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const getMyInvoice = createStoreEndpoint(
	"/orders/me/:id/invoice",
	{
		method: "GET",
		params: z.object({ id: z.string().max(128) }),
		query: z
			.object({
				storeName: z.string().max(200).transform(sanitizeText).optional(),
			})
			.optional(),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.order as OrderController;
		const order = await controller.getById(ctx.params.id);

		if (!order) {
			return { error: "Order not found", status: 404 };
		}

		if (order.customerId !== userId) {
			return { error: "Order not found", status: 404 };
		}

		const storeName =
			(ctx.query as { storeName?: string } | undefined)?.storeName ??
			"86d Store";
		const invoice = await controller.getInvoiceData(ctx.params.id, storeName);
		if (!invoice) {
			return { error: "Invoice not found", status: 404 };
		}

		return { invoice };
	},
);
