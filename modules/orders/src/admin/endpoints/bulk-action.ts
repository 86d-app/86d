import { createAdminEndpoint, z } from "@86d-app/core";
import type {
	OrderController,
	OrderStatus,
	PaymentStatus,
} from "../../service";

export const adminBulkAction = createAdminEndpoint(
	"/admin/orders/bulk",
	{
		method: "POST",
		body: z.object({
			action: z.enum(["updateStatus", "updatePaymentStatus", "delete"]),
			ids: z.array(z.string()).min(1),
			status: z
				.enum([
					"pending",
					"processing",
					"on_hold",
					"completed",
					"cancelled",
					"refunded",
				])
				.optional(),
			paymentStatus: z
				.enum(["unpaid", "paid", "partially_paid", "refunded", "voided"])
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;
		const { action, ids, status, paymentStatus } = ctx.body as {
			action: "updateStatus" | "updatePaymentStatus" | "delete";
			ids: string[];
			status?: OrderStatus | undefined;
			paymentStatus?: PaymentStatus | undefined;
		};

		if (action === "updateStatus") {
			if (!status) {
				return {
					error: "Status is required for updateStatus action",
					status: 400,
				};
			}
			return controller.bulkUpdateStatus(ids, status);
		}

		if (action === "updatePaymentStatus") {
			if (!paymentStatus) {
				return {
					error: "Payment status is required for updatePaymentStatus action",
					status: 400,
				};
			}
			return controller.bulkUpdatePaymentStatus(ids, paymentStatus);
		}

		if (action === "delete") {
			return controller.bulkDelete(ids);
		}

		return { error: "Unknown action", status: 400 };
	},
);
