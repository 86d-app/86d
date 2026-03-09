import { createStoreEndpoint, z } from "@86d-app/core";
import type { MembershipController } from "../../service";

export const getMembership = createStoreEndpoint(
	"/memberships/my-membership",
	{
		method: "GET",
		query: z.object({
			customerId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.memberships as MembershipController;

		const membership = await controller.getCustomerMembership(
			ctx.query.customerId,
		);
		if (!membership) {
			return { membership: null, benefits: [] };
		}

		const benefits = await controller.getCustomerBenefits(ctx.query.customerId);

		return { membership, benefits };
	},
);
