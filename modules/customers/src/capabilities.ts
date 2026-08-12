import {
	customerContactResolveCapability,
	provideCapability,
} from "@86d-app/core";
import { createCustomerController } from "./service-impl";

export { customerContactResolveCapability };

export const customerContactResolveProvider = provideCapability(
	customerContactResolveCapability,
	async (ctx, request) => {
		try {
			const customer = await createCustomerController(
				ctx.data,
				ctx.events,
			).getById(request.customerId);
			if (!customer) {
				return {
					ok: false,
					failure: { code: "customer_not_found" as const },
				};
			}
			return {
				ok: true,
				decision: {
					email: customer.email,
					firstName: customer.firstName,
					lastName: customer.lastName,
					...(customer.phone ? { phone: customer.phone } : {}),
				},
			};
		} catch {
			return { ok: false, failure: { code: "lookup_failed" as const } };
		}
	},
);
