import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CustomerController } from "../../service";

export const createAddress = createStoreEndpoint(
	"/customers/me/addresses",
	{
		method: "POST",
		body: z.object({
			type: z.enum(["billing", "shipping"]).optional(),
			firstName: z.string().min(1).max(200).transform(sanitizeText),
			lastName: z.string().min(1).max(200).transform(sanitizeText),
			company: z.string().max(200).transform(sanitizeText).optional(),
			line1: z.string().min(1).max(500).transform(sanitizeText),
			line2: z.string().max(500).transform(sanitizeText).optional(),
			city: z.string().min(1).max(200).transform(sanitizeText),
			state: z.string().min(1).max(200).transform(sanitizeText),
			postalCode: z.string().min(1).max(20),
			country: z.string().length(2),
			phone: z
				.string()
				.max(50)
				.optional()
				.transform((s) => (s === undefined ? undefined : sanitizeText(s))),
			isDefault: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.customer as CustomerController;
		const address = await controller.createAddress({
			customerId: userId,
			...ctx.body,
		});
		return { address };
	},
);
