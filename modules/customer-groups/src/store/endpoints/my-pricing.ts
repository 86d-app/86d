import { createStoreEndpoint, z } from "@86d-app/core";
import type { CustomerGroupController } from "../../service";

export const myPricing = createStoreEndpoint(
	"/customer-groups/pricing",
	{
		method: "GET",
		query: z
			.object({
				customerId: z.string(),
				scope: z.enum(["all", "category", "product"]).optional(),
				scopeId: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.customerGroups as CustomerGroupController;
		const customerId = ctx.query?.customerId;

		if (!customerId) {
			return { adjustments: [] };
		}

		const adjustments = await controller.getCustomerPricing(customerId, {
			scope: ctx.query?.scope,
			scopeId: ctx.query?.scopeId,
		});

		return { adjustments };
	},
);
