import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	PaymentIntentStatus,
	RevenueIntent,
	RevenuePaymentsController,
} from "../../service";
import { filterAndPageTransactions } from "../../service-impl";

export const listCustomerTransactions = createStoreEndpoint(
	"/revenue/transactions",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(50).optional(),
			status: z
				.enum([
					"pending",
					"processing",
					"succeeded",
					"failed",
					"cancelled",
					"refunded",
				])
				.optional(),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.payments as
			| RevenuePaymentsController
			| undefined;
		if (!controller) {
			return { transactions: [], total: 0 };
		}

		const all = (await controller.listIntents({
			customerId: session.user.id,
			take: 1000,
		})) as RevenueIntent[];

		return filterAndPageTransactions(all, {
			from: null,
			to: null,
			status: ctx.query.status as PaymentIntentStatus | undefined,
			page: ctx.query.page ?? 1,
			limit: ctx.query.limit ?? 10,
		});
	},
);
