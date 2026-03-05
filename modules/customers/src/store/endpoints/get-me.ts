import { createStoreEndpoint } from "@86d-app/core";
import type { CustomerController } from "../../service";

export const getMe = createStoreEndpoint(
	"/customers/me",
	{ method: "GET" },
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.customer as CustomerController;
		const customer = await controller.getById(userId);
		if (!customer) {
			return { error: "Customer not found", status: 404 };
		}

		return { customer };
	},
);
