import { createStoreEndpoint } from "@86d-app/core";
import type { ReferralController } from "../../service";

export const getMyCodeEndpoint = createStoreEndpoint(
	"/referrals/my-code",
	{
		method: "GET",
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Not authenticated" };

		const controller = ctx.context.controllers.referrals as ReferralController;
		let code = await controller.getCodeForCustomer(customerId);

		// Auto-create a code for the customer if they don't have one
		if (!code) {
			code = await controller.createCode({ customerId });
		}

		return { code };
	},
);
