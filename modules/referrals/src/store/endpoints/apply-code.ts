import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ReferralController } from "../../service";

export const applyCodeEndpoint = createStoreEndpoint(
	"/referrals/apply",
	{
		method: "POST",
		body: z.object({
			code: z.string().max(20).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Not authenticated" };

		const controller = ctx.context.controllers.referrals as ReferralController;

		const codeRecord = await controller.getCodeByCode(
			ctx.body.code.toUpperCase(),
		);
		if (!codeRecord) return { error: "Invalid referral code" };
		if (!codeRecord.active) return { error: "This code is no longer active" };
		if (codeRecord.customerId === customerId) {
			return { error: "You cannot use your own referral code" };
		}

		const referral = await controller.createReferral({
			referralCodeId: codeRecord.id,
			refereeCustomerId: customerId,
			refereeEmail: "",
		});

		if (!referral) return { error: "Unable to apply referral code" };
		return { referral };
	},
);
