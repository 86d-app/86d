import { createAdminEndpoint, z } from "@86d-app/core";
import type {
	AmazonController,
	AmazonOrderStatus,
	FulfillmentChannel,
} from "../../service";

export const listOrdersEndpoint = createAdminEndpoint(
	"/admin/amazon/orders",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum(["pending", "unshipped", "shipped", "cancelled", "returned"])
				.optional(),
			fulfillmentChannel: z.enum(["FBA", "FBM"]).optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.amazon as AmazonController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const orders = await controller.listOrders({
			status: ctx.query.status as AmazonOrderStatus | undefined,
			fulfillmentChannel: ctx.query.fulfillmentChannel as
				| FulfillmentChannel
				| undefined,
			take: limit,
			skip,
		});
		return { orders, total: orders.length };
	},
);
