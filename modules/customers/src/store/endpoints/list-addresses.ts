import { createStoreEndpoint } from "@86d-app/core";
import type { CustomerController } from "../../service";

export const listAddresses = createStoreEndpoint(
	"/customers/me/addresses",
	{ method: "GET" },
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.customer as CustomerController;
		const addresses = await controller.listAddresses(userId);
		return { addresses };
	},
);
