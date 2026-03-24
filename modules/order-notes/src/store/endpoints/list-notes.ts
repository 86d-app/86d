import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderNotesController } from "../../service";
import { customerOwnsOrder } from "./_order-access";

export const listNotes = createStoreEndpoint(
	"/orders/:orderId/notes",
	{
		method: "GET",
		params: z.object({ orderId: z.string().max(200) }),
		query: z.object({
			take: z.coerce.number().min(1).max(100).optional(),
			skip: z.coerce.number().min(0).optional(),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) {
			return { error: "Unauthorized", status: 401 };
		}

		const ordersData = ctx.context._dataRegistry?.get("orders");
		if (
			ordersData &&
			!(await customerOwnsOrder(ordersData, ctx.params.orderId, customerId))
		) {
			return { error: "Order not found", status: 404 };
		}

		const controller = ctx.context.controllers
			.orderNotes as OrderNotesController;

		const notes = await controller.listByOrder(ctx.params.orderId, {
			includeInternal: false,
			take: ctx.query.take,
			skip: ctx.query.skip,
		});

		return { notes };
	},
);
