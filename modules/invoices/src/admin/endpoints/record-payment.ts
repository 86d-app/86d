import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { InvoiceController } from "../../service";

export const adminRecordPayment = createAdminEndpoint(
	"/admin/invoices/:id/payments/record",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			amount: z.number().int().min(1),
			method: z.enum([
				"card",
				"bank_transfer",
				"cash",
				"check",
				"store_credit",
				"other",
			]),
			reference: z.string().max(200).transform(sanitizeText).optional(),
			notes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.invoice as InvoiceController;

		const invoice = await controller.getById(ctx.params.id);
		if (!invoice) {
			return { error: "Invoice not found", status: 404 };
		}

		try {
			const payment = await controller.recordPayment({
				invoiceId: ctx.params.id,
				amount: ctx.body.amount,
				method: ctx.body.method,
				reference: ctx.body.reference,
				notes: ctx.body.notes,
			});

			if (ctx.context.events) {
				await ctx.context.events.emit("invoice.payment_recorded", {
					invoiceId: ctx.params.id,
					invoiceNumber: invoice.invoiceNumber,
					paymentId: payment.id,
					amount: payment.amount,
					method: payment.method,
				});
			}

			const updated = await controller.getById(ctx.params.id);
			return { payment, invoice: updated };
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to record payment";
			return { error: message, status: 422 };
		}
	},
);
