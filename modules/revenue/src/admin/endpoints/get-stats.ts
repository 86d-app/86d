import { createAdminEndpoint, z } from "@86d-app/core";
import type {
	RevenueIntent,
	RevenuePaymentsController,
	RevenueStats,
} from "../../service";
import { aggregateStats } from "../../service-impl";

export const getStats = createAdminEndpoint(
	"/admin/revenue/stats",
	{
		method: "GET",
		query: z.object({
			from: z.string().datetime().optional(),
			to: z.string().datetime().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as
			| RevenuePaymentsController
			| undefined;

		const empty: RevenueStats = {
			totalVolume: 0,
			transactionCount: 0,
			averageValue: 0,
			currency: "USD",
			byStatus: {
				pending: 0,
				processing: 0,
				succeeded: 0,
				failed: 0,
				cancelled: 0,
				refunded: 0,
			},
			refundVolume: 0,
			refundCount: 0,
		};

		if (!controller) {
			return empty;
		}

		const all = (await controller.listIntents({
			take: 10000,
		})) as RevenueIntent[];
		const from = ctx.query.from ? new Date(ctx.query.from) : null;
		const to = ctx.query.to ? new Date(ctx.query.to) : null;

		return aggregateStats(all, from, to);
	},
);
