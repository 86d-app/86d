import { createAdminEndpoint, z } from "@86d-app/core";
import type {
	PaymentIntentStatus,
	RevenueIntent,
	RevenuePaymentsController,
} from "../../service";
import { buildCSV } from "../../service-impl";

export const exportTransactions = createAdminEndpoint(
	"/admin/revenue/export",
	{
		method: "GET",
		query: z.object({
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
			from: z.string().datetime().optional(),
			to: z.string().datetime().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as
			| RevenuePaymentsController
			| undefined;

		if (!controller) {
			return { csv: "", count: 0 };
		}

		const all = (await controller.listIntents({
			take: 10000,
		})) as RevenueIntent[];

		const from = ctx.query.from ? new Date(ctx.query.from) : null;
		const to = ctx.query.to ? new Date(ctx.query.to) : null;
		const statusFilter = ctx.query.status as PaymentIntentStatus | undefined;

		const filtered = all.filter((i) => {
			const t = new Date(i.createdAt);
			if (from && t < from) return false;
			if (to && t > to) return false;
			if (statusFilter && i.status !== statusFilter) return false;
			return true;
		});

		filtered.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		const csv = buildCSV(filtered);
		return { csv, count: filtered.length };
	},
);
