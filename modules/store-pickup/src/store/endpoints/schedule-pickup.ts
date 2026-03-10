import { createStoreEndpoint, z } from "@86d-app/core";
import type {
	SchedulePickupParams,
	StorePickupController,
} from "../../service";

export const schedulePickup = createStoreEndpoint(
	"/store-pickup/schedule",
	{
		method: "POST",
		body: z.object({
			locationId: z.string().min(1),
			windowId: z.string().min(1),
			orderId: z.string().min(1),
			scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			customerId: z.string().optional(),
			notes: z.string().max(1000).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.storePickup as StorePickupController;
		const params: SchedulePickupParams = {
			locationId: ctx.body.locationId,
			windowId: ctx.body.windowId,
			orderId: ctx.body.orderId,
			scheduledDate: ctx.body.scheduledDate,
		};
		if (ctx.body.customerId != null) params.customerId = ctx.body.customerId;
		if (ctx.body.notes != null) params.notes = ctx.body.notes;
		const pickup = await controller.schedulePickup(params);
		return { pickup };
	},
);
