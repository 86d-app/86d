import { createAdminEndpoint, z } from "@86d-app/core";
import type { WarrantyController } from "../../service";

export const registerWarranty = createAdminEndpoint(
	"/admin/warranties/registrations/create",
	{
		method: "POST",
		body: z.object({
			warrantyPlanId: z.string(),
			orderId: z.string(),
			customerId: z.string(),
			productId: z.string(),
			productName: z.string().min(1).max(500),
			serialNumber: z.string().max(200).optional(),
			purchaseDate: z.coerce.date().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.warranties as WarrantyController;
		const registration = await controller.register(ctx.body);
		return { registration };
	},
);
