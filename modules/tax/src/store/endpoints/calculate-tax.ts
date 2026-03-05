import { createStoreEndpoint, z } from "@86d-app/core";
import type { TaxController } from "../../service";

export const calculateTax = createStoreEndpoint(
	"/tax/calculate",
	{
		method: "POST",
		body: z.object({
			address: z.object({
				country: z.string().length(2),
				state: z.string().min(1),
				city: z.string().optional(),
				postalCode: z.string().optional(),
			}),
			lineItems: z.array(
				z.object({
					productId: z.string(),
					categoryId: z.string().optional(),
					amount: z.number().min(0),
					quantity: z.number().int().min(1),
				}),
			),
			shippingAmount: z.number().min(0).optional(),
			customerId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tax as TaxController;

		// If authenticated, prefer session user ID for exemption checks
		const customerId = ctx.body.customerId ?? ctx.context.session?.user.id;

		const calculation = await controller.calculate({
			address: ctx.body.address,
			lineItems: ctx.body.lineItems,
			shippingAmount: ctx.body.shippingAmount,
			customerId,
		});

		return { calculation };
	},
);
