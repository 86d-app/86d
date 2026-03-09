import { createStoreEndpoint, z } from "@86d-app/core";
import type { MembershipController } from "../../service";

export const cancel = createStoreEndpoint(
	"/memberships/cancel",
	{
		method: "POST",
		body: z.object({
			membershipId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.memberships as MembershipController;

		const membership = await controller.cancelMembership(ctx.body.membershipId);
		if (!membership) {
			return { error: "Membership not found", status: 404 };
		}

		return { membership };
	},
);
