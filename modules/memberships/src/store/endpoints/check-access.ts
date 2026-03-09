import { createStoreEndpoint, z } from "@86d-app/core";
import type { MembershipController } from "../../service";

export const checkAccess = createStoreEndpoint(
	"/memberships/check-access",
	{
		method: "GET",
		query: z.object({
			customerId: z.string().min(1),
			productId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.memberships as MembershipController;

		const hasAccess = await controller.canAccessProduct({
			customerId: ctx.query.customerId,
			productId: ctx.query.productId,
		});

		return { hasAccess };
	},
);
