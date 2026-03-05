import { createStoreEndpoint, z } from "@86d-app/core";
import type { TaxController } from "../../service";

export const getApplicableRates = createStoreEndpoint(
	"/tax/rates",
	{
		method: "GET",
		query: z.object({
			country: z.string().length(2),
			state: z.string().min(1),
			city: z.string().optional(),
			postalCode: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tax as TaxController;
		const rates = await controller.getRatesForAddress({
			country: ctx.query.country,
			state: ctx.query.state,
			city: ctx.query.city,
			postalCode: ctx.query.postalCode,
		});

		// Return only public-facing fields
		return {
			rates: rates.map((r) => ({
				name: r.name,
				rate: r.rate,
				type: r.type,
				inclusive: r.inclusive,
			})),
		};
	},
);
