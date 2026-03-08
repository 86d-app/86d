import { createAdminEndpoint, z } from "@86d-app/core";
import type { CustomerGroupController } from "../../service";

export const evaluateRules = createAdminEndpoint(
	"/admin/customer-groups/evaluate",
	{
		method: "POST",
		body: z.object({
			customerData: z.record(z.string(), z.unknown()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.customerGroups as CustomerGroupController;

		const matchingGroupIds = await controller.evaluateRules(
			ctx.body.customerData,
		);

		return { matchingGroupIds };
	},
);
