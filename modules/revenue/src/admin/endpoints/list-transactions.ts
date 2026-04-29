import { createAdminEndpoint, z } from "@86d-app/core";
import type {
	PaymentIntentStatus,
	RevenueIntent,
	RevenuePaymentsController,
} from "../../service";
import { filterAndPageTransactions } from "../../service-impl";

export const listTransactions = createAdminEndpoint(
	"/admin/revenue/transactions",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
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
			search: z.string().max(200).optional(),
			from: z.string().datetime().optional(),
			to: z.string().datetime().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as
			| RevenuePaymentsController
			| undefined;

		if (!controller) {
			return { transactions: [], total: 0 };
		}

		const all = (await controller.listIntents({
			take: 10000,
		})) as RevenueIntent[];

		return filterAndPageTransactions(all, {
			from: ctx.query.from ? new Date(ctx.query.from) : null,
			to: ctx.query.to ? new Date(ctx.query.to) : null,
			status: ctx.query.status as PaymentIntentStatus | undefined,
			search: ctx.query.search,
			page: ctx.query.page ?? 1,
			limit: ctx.query.limit ?? 20,
		});
	},
);
