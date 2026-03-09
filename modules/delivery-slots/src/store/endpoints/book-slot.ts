import { createStoreEndpoint, z } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const bookSlot = createStoreEndpoint(
	"/delivery-slots/book",
	{
		method: "POST",
		body: z.object({
			scheduleId: z.string().min(1),
			deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			orderId: z.string().min(1),
			customerId: z.string().optional(),
			instructions: z.string().max(1000).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const params: import("../../service").BookSlotParams = {
			scheduleId: ctx.body.scheduleId,
			deliveryDate: ctx.body.deliveryDate,
			orderId: ctx.body.orderId,
		};
		if (ctx.body.customerId != null) params.customerId = ctx.body.customerId;
		if (ctx.body.instructions != null)
			params.instructions = ctx.body.instructions;
		const booking = await controller.bookSlot(params);
		return { booking };
	},
);
