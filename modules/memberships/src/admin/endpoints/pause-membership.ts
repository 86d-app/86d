import { createAdminEndpoint, z } from "@86d-app/core";
import type { MembershipController } from "../../service";

export const pauseMembership = createAdminEndpoint(
	"/admin/memberships/:id/pause",
	{
		method: "POST",
		params: z.object({ id: z.string().min(1) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.memberships as MembershipController;

		const membership = await controller.pauseMembership(ctx.params.id);
		if (!membership) {
			return { error: "Membership not found", status: 404 };
		}

		return { membership };
	},
);
