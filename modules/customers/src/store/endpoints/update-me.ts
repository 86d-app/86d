import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { CustomerController } from "../../service";

export const updateMe = createStoreEndpoint(
	"/customers/me",
	{
		method: "PUT",
		body: z.object({
			firstName: z.string().min(1).max(200).transform(sanitizeText).optional(),
			lastName: z.string().min(1).max(200).transform(sanitizeText).optional(),
			phone: z.string().max(50).nullable().optional(),
			dateOfBirth: z
				.string()
				.datetime()
				.transform((s) => new Date(s))
				.nullable()
				.optional(),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.customer as CustomerController;
		const customer = await controller.update(userId, ctx.body);
		if (!customer) {
			return { error: "Customer not found", status: 404 };
		}

		return { customer };
	},
);
