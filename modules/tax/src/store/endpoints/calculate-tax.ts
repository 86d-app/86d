import { createStoreEndpoint } from "@86d-app/core/api";
import { sanitizeText } from "@86d-app/core/sanitize";
import { z } from "@86d-app/core/zod";
import type { TaxController } from "../../service";

export const calculateTax = createStoreEndpoint(
	"/tax/calculate",
	{
		method: "POST",
		body: z.object({
			address: z.object({
				country: z.string().length(2),
				state: z.string().min(1).max(100).transform(sanitizeText),
				city: z.string().max(200).transform(sanitizeText).optional(),
				postalCode: z.string().max(20).transform(sanitizeText).optional(),
			}),
			lineItems: z
				.array(
					z.object({
						productId: z.string().max(200),
						categoryId: z.string().max(200).optional(),
						amount: z.number().min(0),
						quantity: z.number().int().min(1),
					}),
				)
				.max(200),
			shippingAmount: z.number().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tax as TaxController;

		// Derive customerId from session for exemption checks
		const customerId = ctx.context.session?.user.id;

		const calculation = await controller.calculate({
			address: ctx.body.address,
			lineItems: ctx.body.lineItems,
			shippingAmount: ctx.body.shippingAmount,
			customerId,
		});

		// Absence of a matching rate is not a sellable zero. Fail closed so
		// clients cannot treat an unresolved jurisdiction as tax-free.
		if (calculation.lines.some((line) => line.unresolved)) {
			return {
				code: "TAX_REVIEW_REQUIRED",
				error: "Tax requires merchant review before payment.",
				status: 422,
			};
		}

		return { calculation };
	},
);
