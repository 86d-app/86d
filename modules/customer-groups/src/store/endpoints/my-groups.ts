import { createStoreEndpoint, z } from "@86d-app/core";
import type { CustomerGroupController } from "../../service";

export const myGroups = createStoreEndpoint(
	"/customer-groups/mine",
	{
		method: "GET",
		query: z
			.object({
				customerId: z.string(),
			})
			.optional(),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.customerGroups as CustomerGroupController;
		const customerId = ctx.query?.customerId;

		if (!customerId) {
			return { groups: [] };
		}

		const groups = await controller.getCustomerGroups(customerId);

		return { groups };
	},
);
