import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CustomerController } from "../../service";

export const updateAddress = createStoreEndpoint(
	"/customers/me/addresses/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string().max(200) }),
		body: z.object({
			type: z.enum(["billing", "shipping"]).optional(),
			firstName: z.string().min(1).max(200).transform(sanitizeText).optional(),
			lastName: z.string().min(1).max(200).transform(sanitizeText).optional(),
			company: z
				.string()
				.max(200)
				.transform(sanitizeText)
				.nullable()
				.optional(),
			line1: z.string().min(1).max(500).transform(sanitizeText).optional(),
			line2: z.string().max(500).transform(sanitizeText).nullable().optional(),
			city: z.string().min(1).max(200).transform(sanitizeText).optional(),
			state: z.string().min(1).max(200).transform(sanitizeText).optional(),
			postalCode: z.string().min(1).max(20).optional(),
			country: z.string().length(2).optional(),
			phone: z.string().max(50).nullable().optional(),
			isDefault: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.customer as CustomerController;

		// Verify ownership
		const existing = await controller.getAddress(ctx.params.id);
		if (!existing || existing.customerId !== userId) {
			return { error: "Address not found", status: 404 };
		}

		const address = await controller.updateAddress(ctx.params.id, ctx.body);
		return { address };
	},
);
