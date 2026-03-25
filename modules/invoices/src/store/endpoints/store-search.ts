import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { InvoiceController } from "../../service";

export const storeSearch = createStoreEndpoint(
	"/invoices/store-search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(1).max(200).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.invoice as InvoiceController;
		const { invoices, total } = await controller.list({
			search: ctx.query.q,
			customerId: userId,
			limit: 10,
		});

		return {
			results: invoices.map((inv) => ({
				id: inv.id,
				title: `Invoice ${inv.invoiceNumber}`,
				type: "invoice" as const,
			})),
			total,
		};
	},
);
