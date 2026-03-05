import { createStoreEndpoint, z } from "@86d-app/core";
import type { GiftCardController } from "../../service";

export const redeemGiftCard = createStoreEndpoint(
	"/gift-cards/redeem",
	{
		method: "POST",
		body: z.object({
			code: z.string().min(1).max(50),
			amount: z.number().positive(),
			orderId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.giftCards as GiftCardController;
		const result = await controller.redeem(
			ctx.body.code,
			ctx.body.amount,
			ctx.body.orderId,
		);

		if (!result) {
			return {
				error:
					"Gift card not found, inactive, expired, or insufficient balance",
				status: 400,
			};
		}

		return {
			amountApplied: result.transaction.amount,
			remainingBalance: result.giftCard.currentBalance,
			currency: result.giftCard.currency,
		};
	},
);
