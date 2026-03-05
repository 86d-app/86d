import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { customersSchema } from "./schema";
import { createCustomerController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

// Export types for other modules to use via inter-module contracts
export type {
	Customer,
	CustomerAddress,
	CustomerController,
	ImportCustomerResult,
	ImportCustomerRow,
	LoyaltyBalance,
	LoyaltyRules,
	LoyaltyStats,
	LoyaltyTransaction,
} from "./service";
export { DEFAULT_LOYALTY_RULES } from "./service";

export interface CustomersOptions extends ModuleConfig {
	/**
	 * Whether to automatically create a customer record when a user signs up
	 * @default true
	 */
	autoCreateOnSignup?: boolean;
}

/**
 * Customers module factory function.
 * Provides customer profile and address management.
 *
 * Exports (for other modules):
 *   read: ["customerEmail", "customerFirstName", "customerLastName", "customerPhone"]
 */
export default function customers(options?: CustomersOptions): Module {
	return {
		id: "customers",
		version: "0.0.1",
		schema: customersSchema,
		exports: {
			read: [
				"customerEmail",
				"customerName",
				"customerPhone",
				"customerAddresses",
			],
		},
		events: {
			emits: ["customer.created", "customer.updated"],
		},

		init: async (ctx: ModuleContext) => {
			const controller = createCustomerController(ctx.data, ctx.events);
			return {
				controllers: { customer: controller },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},

		admin: {
			pages: [
				{
					path: "/admin/customers",
					component: "CustomerList",
					label: "Customers",
					icon: "Users",
					group: "Customers",
				},
				{ path: "/admin/customers/:id", component: "CustomerDetail" },
				{
					path: "/admin/customers/tags",
					component: "CustomerTags",
					label: "Tags",
					icon: "Tag",
					group: "Customers",
				},
				{
					path: "/admin/customers/loyalty",
					component: "LoyaltyAdmin",
					label: "Loyalty",
					icon: "Star",
					group: "Customers",
				},
			],
		},

		options,
	};
}
